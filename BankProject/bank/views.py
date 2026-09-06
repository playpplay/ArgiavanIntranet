from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.db import models, transaction
from django.views.decorators.http import require_POST
from decimal import Decimal
from .forms import LoginForm, RegisterForm, TransferForm, OpenAccountForm, CurrencyPreferenceForm, CreateGovernmentAccountForm
from .models import Account, Transaction, User, Currency, ExchangeRate, TransactionType
from django.db.models import Q


def home(request):
    return render(request, 'bank/home.html')


def register_view(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Регистрация прошла успешно! Расчетный счет создан с нулевым балансом.')
            return redirect('dashboard')
    else:
        form = RegisterForm()
    return render(request, 'bank/register.html', {'form': form})


def login_view(request):
    if request.method == 'POST':
        form = LoginForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('dashboard')
    else:
        form = LoginForm()
    return render(request, 'bank/login.html', {'form': form})


@login_required
def logout_view(request):
    logout(request)
    return redirect('home')


@login_required
def dashboard(request):
    if not request.user.is_authenticated:
        return redirect('login')

    # Получаем активные счета пользователя
    accounts = Account.objects.filter(
        user=request.user,
        is_active=True
    ).select_related('currency').order_by('-created_at')

    # Определяем валюту отображения
    display_currency = request.user.display_currency
    if not display_currency:
        # Если у пользователя не установлена валюта, используем основную
        display_currency = Currency.objects.filter(is_primary=True, is_active=True).first()
        if display_currency:
            request.user.display_currency = display_currency
            request.user.save()

    # Рассчитываем общий баланс в валюте отображения
    total_balance = Decimal('0.00')
    for account in accounts:
        if account.currency == display_currency:
            total_balance += account.balance
        else:
            rate = ExchangeRate.get_current_rate(account.currency, display_currency)
            if rate:
                total_balance += account.balance * rate

    # Получаем последние 2 транзакции пользователя
    recent_transactions = Transaction.objects.filter(
        Q(from_account__user=request.user) | Q(to_account__user=request.user)
    ).select_related(
        'from_account__currency',
        'to_account__currency',
        'transaction_type'
    ).order_by('-timestamp')[:2]

    # Получаем активные валюты для выбора
    available_currencies = Currency.objects.filter(is_active=True)

    # Считаем активные счета
    active_accounts = accounts.filter(status='ACTIVE').count()

    # Считаем счета на рассмотрении
    pending_accounts = accounts.filter(status='PENDING').count()

    context = {
        'accounts': accounts,
        'recent_transactions': recent_transactions,
        'total_balance': total_balance,
        'display_currency': display_currency,
        'available_currencies': available_currencies,
        'active_accounts': active_accounts,
        'pending_accounts': pending_accounts,
    }
    return render(request, 'bank/dashboard.html', context)


@login_required
def transfer_view(request):
    # Получаем основную валюту в самом начале
    primary_currency = Currency.objects.filter(is_primary=True, is_active=True).first()

    if not primary_currency:
        messages.error(request, 'Основная валюта не настроена в системе. Обратитесь к администратору.')
        return redirect('dashboard')

    if request.method == 'POST':
        form = TransferForm(request.user, request.POST)

        if form.is_valid():
            try:
                with transaction.atomic():
                    from_account = form.cleaned_data['from_account']
                    to_account = form.cleaned_data['to_account']
                    amount = form.cleaned_data['amount']
                    description = form.cleaned_data['description']

                    print(f"=== НАЧАЛО ПЕРЕВОДА ===")
                    print(f"От: {from_account.account_number} ({from_account.currency.code})")
                    print(f"Кому: {to_account.account_number} ({to_account.currency.code})")
                    print(f"Сумма: {amount:.15f} {from_account.currency.symbol}")

                    # Проверяем счета
                    if from_account.status == 'FROZEN' or not from_account.is_active:
                        messages.error(request, 'Счет отправителя заморожен или не активен')
                        return redirect('transfer')

                    if to_account.status == 'FROZEN' or not to_account.is_active:
                        messages.error(request, 'Счет получателя заморожен или не активен')
                        return redirect('transfer')

                    # Проверяем достаточно ли средств
                    if not from_account.can_withdraw(amount):
                        messages.error(request,
                                       f'Недостаточно средств. На счете: {from_account.balance:.15f} {from_account.currency.symbol}')
                        return redirect('transfer')

                    # Получаем тип транзакции "Перевод"
                    transfer_type = TransactionType.objects.filter(code='TRANSFER', is_active=True).first()
                    if not transfer_type:
                        transfer_type = TransactionType.objects.create(
                            name='Перевод',
                            code='TRANSFER',
                            is_positive=True,
                            is_active=True
                        )

                    # Находим основную валюту (ARY)
                    primary_currency = Currency.objects.filter(is_primary=True, is_active=True).first()
                    if not primary_currency:
                        messages.error(request, 'Основная валюта не настроена в системе')
                        return redirect('transfer')

                    print(f"Основная валюта: {primary_currency.code}")

                    # КОНВЕРТАЦИЯ ЧЕРЕЗ ОСНОВНУЮ ВАЛЮТУ ARY
                    # Шаг 1: Конвертируем из валюты отправителя в ARY
                    amount_in_ary = amount
                    rate_to_ary = None
                    rate_from_ary = None
                    exchange_rate = None

                    if from_account.currency != primary_currency:
                        rate_to_ary = ExchangeRate.get_current_rate(from_account.currency, primary_currency)
                        print(f"Курс {from_account.currency.code}→ARY: {rate_to_ary}")
                        if not rate_to_ary:
                            messages.error(request, f'Нет курса для конвертации {from_account.currency.code} → ARY')
                            return redirect('transfer')
                        amount_in_ary = amount * rate_to_ary
                        print(f"Сумма в ARY после конвертации: {amount_in_ary:.15f}")

                    # Шаг 2: Конвертируем из ARY в валюту получателя
                    if to_account.currency != primary_currency:
                        rate_from_ary = ExchangeRate.get_current_rate(primary_currency, to_account.currency)
                        print(f"Курс ARY→{to_account.currency.code}: {rate_from_ary}")
                        if not rate_from_ary:
                            messages.error(request, f'Нет курса для конвертации ARY → {to_account.currency.code}')
                            return redirect('transfer')
                        amount_for_receiver = amount_in_ary * rate_from_ary
                    else:
                        amount_for_receiver = amount_in_ary

                    # Рассчитываем общий курс для записи в транзакцию
                    if from_account.currency != to_account.currency:
                        if rate_to_ary and rate_from_ary:
                            exchange_rate = rate_to_ary * rate_from_ary
                        else:
                            exchange_rate = ExchangeRate.get_current_rate(from_account.currency, to_account.currency)

                    print(f"Итоговая сумма для получателя: {amount_for_receiver:.15f} {to_account.currency.symbol}")

                    # Создаем транзакцию
                    transaction_obj = Transaction(
                        from_account=from_account,
                        to_account=to_account,
                        transaction_type=transfer_type,
                        amount=amount_for_receiver,
                        original_amount=amount,
                        exchange_rate=exchange_rate,
                        description=description or f'Перевод между счетами через {primary_currency.code}'
                    )
                    transaction_obj.save()

                    # Обновляем балансы с высокой точностью
                    from_account.balance -= amount
                    from_account.save()

                    to_account.balance += amount_for_receiver
                    to_account.save()

                    # Формируем информативное сообщение
                    if from_account.currency == to_account.currency:
                        msg = f'Перевод на сумму {amount:.15f} {from_account.currency.symbol} выполнен успешно!'
                    else:
                        conversion_info = f'({amount:.15f} {from_account.currency.symbol} → {amount_for_receiver:.15f} {to_account.currency.symbol})'
                        if rate_to_ary:
                            conversion_info += f' [1 {from_account.currency.code} = {rate_to_ary:.15f} ARY]'
                        if rate_from_ary:
                            conversion_info += f' [1 ARY = {rate_from_ary:.15f} {to_account.currency.code}]'

                        msg = f'Перевод выполнен успешно! {conversion_info}'

                    messages.success(request, msg)
                    print(f"Перевод успешно завершен")
                    return redirect('dashboard')

            except Exception as e:
                print(f"ОШИБКА ПЕРЕВОДА: {str(e)}")
                import traceback
                traceback.print_exc()
                messages.error(request, f'Ошибка при выполнении перевода: {str(e)}')
    else:
        form = TransferForm(request.user)

    # Получаем курсы всех валют к ARY для отображения
    primary_currency = Currency.objects.filter(is_primary=True, is_active=True).first()
    exchange_rates_to_ary = []
    exchange_rates_from_ary = []

    # Получаем курсы всех валют к ARY для отображения
    exchange_rates_to_ary = []
    exchange_rates_from_ary = []

    # Все активные валюты кроме основной
    other_currencies = Currency.objects.filter(is_active=True).exclude(id=primary_currency.id)

    for currency in other_currencies:
        # Курс валюты к основной
        rate_to_ary = ExchangeRate.get_current_rate(currency, primary_currency)
        # Курс основной к валюте
        rate_from_ary = ExchangeRate.get_current_rate(primary_currency, currency)

        exchange_rates_to_ary.append({
            'currency': currency,
            'rate': rate_to_ary,
            'direction': f"{currency.code} → {primary_currency.code}"
        })

        exchange_rates_from_ary.append({
            'currency': currency,
            'rate': rate_from_ary,
            'direction': f"{primary_currency.code} → {currency.code}"
        })

    return render(request, 'bank/transfer.html', {
        'form': form,
        'primary_currency': primary_currency,
        'exchange_rates_to_ary': exchange_rates_to_ary,
        'exchange_rates_from_ary': exchange_rates_from_ary,
    })


@login_required
def transaction_history(request):
    transactions = Transaction.objects.filter(
        Q(from_account__user=request.user) | Q(to_account__user=request.user)
    ).order_by('-timestamp')

    # Получаем валюту отображения пользователя
    display_currency = request.user.display_currency or Currency.objects.filter(is_primary=True, is_active=True).first()

    return render(request, 'bank/transactions.html', {
        'transactions': transactions,
        'display_currency': display_currency,
    })


@login_required
def open_account_view(request):
    print(f"=== OPEN ACCOUNT REQUEST ===")
    print(f"Пользователь: {request.user.username}")

    # Проверяем количество счетов на рассмотрении
    pending_accounts_count = Account.objects.filter(
        user=request.user,
        status='PENDING',
        is_active=True
    ).count()

    print(f"Счетов на рассмотрении: {pending_accounts_count}")

    # Если уже есть 2 счета на рассмотрении, запрещаем открытие нового
    if pending_accounts_count >= 2:
        messages.error(request,
            'У вас уже есть 2 счета на рассмотрении. Новые счета нельзя открывать, пока предыдущие не будут активированы.'
        )
        return redirect('dashboard')

    if request.method == 'POST':
        form = OpenAccountForm(request.user, request.POST)
        print(f"POST данные: {request.POST}")
        print(f"Форма инициализирована: {form}")

        if form.is_valid():
            print(f"Форма валидна. Очищенные данные:")
            for key, value in form.cleaned_data.items():
                print(f"  {key}: {value}")

            try:
                with transaction.atomic():
                    account_type = form.cleaned_data['account_type']
                    currency = form.cleaned_data['currency']
                    initial_deposit = form.cleaned_data.get('initial_deposit', Decimal('0.00'))

                    print(f"Создание счета:")
                    print(f"  Тип: {account_type}")
                    print(f"  Валюта: {currency.code} ({currency.name})")
                    print(f"  Начальный взнос: {initial_deposit}")

                    # Если initial_deposit равно None, устанавливаем 0.00
                    if initial_deposit is None:
                        initial_deposit = Decimal('0.00')
                        print(f"  Начальный взнос исправлен на: {initial_deposit}")

                    # Если есть начальный взнос, списываем с расчетного счета
                    source_account = None
                    if initial_deposit > Decimal('0.00'):
                        print(f"Начальный взнос > 0. Ищем источник...")

                        # Ищем счет с достаточным балансом для конвертации
                        checking_accounts = Account.objects.filter(
                            user=request.user,
                            account_type='CHECKING',
                            is_active=True,
                            status='ACTIVE'
                        ).select_related('currency')

                        print(f"  Найдено расчетных счетов: {checking_accounts.count()}")
                        for acc in checking_accounts:
                            print(f"    - {acc.account_number}: {acc.balance:.15f} {acc.currency.code}")

                        amount_to_withdraw = Decimal('0.00')

                        for account in checking_accounts:
                            if account.currency == currency:
                                # Та же валюта
                                if account.balance >= initial_deposit:
                                    source_account = account
                                    amount_to_withdraw = initial_deposit
                                    print(f"  Найден счет в той же валюте: {account.account_number}")
                                    break
                            else:
                                # Нужно конвертировать
                                rate = ExchangeRate.get_current_rate(account.currency, currency)
                                print(f"  Курс {account.currency.code}→{currency.code}: {rate}")
                                if rate:
                                    amount_in_account_currency = initial_deposit / rate
                                    print(f"  Требуется в валюте счета: {amount_in_account_currency:.15f}")
                                    if account.balance >= amount_in_account_currency:
                                        source_account = account
                                        amount_to_withdraw = amount_in_account_currency
                                        print(f"  Найден счет для конвертации: {account.account_number}")
                                        break

                        if not source_account:
                            print(f"  ОШИБКА: Не найден счет с достаточными средствами")
                            messages.error(request, 'Недостаточно средств на расчетных счетах для начального взноса')
                            return redirect('open_account')

                        # Получаем тип транзакции "Снятие"
                        withdrawal_type = TransactionType.objects.filter(code='WITHDRAWAL', is_active=True).first()
                        if not withdrawal_type:
                            withdrawal_type = TransactionType.objects.create(
                                name='Снятие',
                                code='WITHDRAWAL',
                                is_positive=False,
                                is_active=True
                            )
                            print(f"  Создан тип транзакции: WITHDRAWAL")

                        # Списание
                        print(
                            f"  Списание с счета {source_account.account_number}: {amount_to_withdraw:.15f} {source_account.currency.symbol}")
                        source_account.balance -= amount_to_withdraw
                        source_account.save()

                        # Записываем транзакцию
                        Transaction.objects.create(
                            from_account=source_account,
                            to_account=None,
                            transaction_type=withdrawal_type,
                            amount=amount_to_withdraw,
                            original_amount=amount_to_withdraw,
                            description=f'Начальный взнос для нового {dict(Account.ACCOUNT_TYPES)[account_type]} счета (ожидает активации)'
                        )
                        print(f"  Транзакция списания создана")

                    # Создаем новый счет со статусом PENDING (на рассмотрении)
                    print(f"Создание нового счета со статусом PENDING...")
                    new_account = Account.objects.create(
                        user=request.user,
                        account_type=account_type,
                        currency=currency,
                        balance=initial_deposit,
                        status='PENDING',
                        is_active=True
                    )
                    print(f"  Счет создан: {new_account.account_number}, статус: PENDING")

                    if initial_deposit > Decimal('0.00'):
                        # Получаем тип транзакции "Пополнение"
                        deposit_type = TransactionType.objects.filter(code='DEPOSIT', is_active=True).first()
                        if not deposit_type:
                            deposit_type = TransactionType.objects.create(
                                name='Пополнение',
                                code='DEPOSIT',
                                is_positive=True,
                                is_active=True
                            )
                            print(f"  Создан тип транзакции: DEPOSIT")

                        # Записываем транзакцию пополнения нового счета
                        Transaction.objects.create(
                            from_account=None,
                            to_account=new_account,
                            transaction_type=deposit_type,
                            amount=initial_deposit,
                            original_amount=initial_deposit,
                            description=f'Начальный взнос для нового счета (ожидает активации)'
                        )
                        print(f"  Транзакция пополнения создана")

                    messages.success(request,
                                     f'Заявка на открытие счета принята! Номер заявки: {new_account.account_number}. '
                                     f'Статус: На рассмотрении. Баланс после активации: {initial_deposit} {currency.symbol}')
                    print(f"=== ЗАЯВКА НА ОТКРЫТИЕ СЧЕТА ПРИНЯТА ===")
                    return redirect('dashboard')

            except Exception as e:
                print(f"ОШИБКА при открытии счета: {str(e)}")
                import traceback
                traceback.print_exc()
                messages.error(request, f'Ошибка при открытии счета: {str(e)}')
        else:
            print(f"Форма НЕ валидна. Ошибки:")
            for field, errors in form.errors.items():
                print(f"  {field}: {errors}")
            messages.error(request, 'Пожалуйста, исправьте ошибки в форме')
    else:
        form = OpenAccountForm(request.user)
        print(f"GET запрос. Форма создана")

    return render(request, 'bank/open_account.html', {
        'form': form,
        'pending_accounts_count': pending_accounts_count,
    })


@login_required
def account_detail(request, account_id):
    account = get_object_or_404(Account, id=account_id, user=request.user)

    # Получаем валюту отображения пользователя
    display_currency = request.user.display_currency or Currency.objects.filter(is_primary=True, is_active=True).first()

    # Рассчитываем конвертированный баланс и курс
    converted_balance = None
    exchange_rate = None

    if display_currency and display_currency != account.currency:
        exchange_rate = ExchangeRate.get_current_rate(account.currency, display_currency)
        if exchange_rate:
            converted_balance = account.balance * exchange_rate

    # Получаем историю операций по этому счету
    transactions = Transaction.objects.filter(
        Q(from_account=account) | Q(to_account=account)
    ).select_related(
        'from_account__currency',
        'to_account__currency',
        'transaction_type',
        'from_account__user',
        'to_account__user'
    ).order_by('-timestamp')

    # Получаем другие активные валюты для отображения конвертации
    other_currencies = []
    all_currencies = Currency.objects.filter(is_active=True).exclude(id=account.currency.id)

    for currency in all_currencies:
        rate = ExchangeRate.get_current_rate(account.currency, currency)
        converted = None
        if rate:
            converted = account.balance * rate

        other_currencies.append({
            'id': currency.id,
            'name': currency.name,
            'code': currency.code,
            'symbol': currency.symbol,
            'rate': rate,
            'converted_balance': converted
        })

    context = {
        'account': account,
        'transactions': transactions,
        'display_currency': display_currency,
        'converted_balance': converted_balance,
        'exchange_rate': exchange_rate,
        'other_currencies': other_currencies,
    }
    return render(request, 'bank/account_detail.html', context)


@login_required
def profile_view(request):
    user = request.user
    accounts = Account.objects.filter(user=user)

    if request.method == 'POST':
        # Обновление профиля
        user.first_name = request.POST.get('first_name', user.first_name)
        user.last_name = request.POST.get('last_name', user.last_name)
        user.email = request.POST.get('email', user.email)
        user.phone = request.POST.get('phone', user.phone)
        user.address = request.POST.get('address', user.address)
        user.save()
        messages.success(request, 'Профиль успешно обновлен!')
        return redirect('profile')

    # Получаем валюту отображения пользователя
    display_currency = user.display_currency or Currency.objects.filter(is_primary=True, is_active=True).first()

    return render(request, 'bank/profile.html', {
        'user': user,
        'accounts': accounts,
        'display_currency': display_currency,
    })


@login_required
@require_POST
def freeze_account_view(request, account_id):
    """Замораживание счета пользователем"""
    account = get_object_or_404(Account, id=account_id, user=request.user)

    if account.can_be_frozen():
        try:
            account.freeze()

            # Получаем тип транзакции "Комиссия"
            fee_type = TransactionType.objects.filter(code='FEE', is_active=True).first()
            if not fee_type:
                fee_type = TransactionType.objects.create(
                    name='Комиссия',
                    code='FEE',
                    is_positive=False,
                    is_active=True
                )

            # Создаем запись о транзакции (для аудита)
            Transaction.objects.create(
                from_account=None,
                to_account=account,
                transaction_type=fee_type,
                amount=Decimal('0.00'),
                original_amount=Decimal('0.00'),
                description=f'Счет {account.account_number} заморожен пользователем'
            )

            messages.success(request, f'Счет {account.account_number} успешно заморожен.')
        except Exception as e:
            messages.error(request, f'Ошибка при заморозке счета: {str(e)}')
    else:
        messages.error(request, 'Невозможно заморозить этот счет. Счет уже заморожен или не активен.')

    return redirect('account_detail', account_id=account_id)


@login_required
def account_actions_view(request, account_id):
    """Страница действий со счетом"""
    account = get_object_or_404(Account, id=account_id, user=request.user)

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'freeze' and account.can_be_frozen():
            try:
                account.freeze()
                messages.success(request, f'Счет {account.account_number} успешно заморожен.')
            except Exception as e:
                messages.error(request, f'Ошибка при заморозке счета: {str(e)}')

    return redirect('account_detail', account_id=account_id)


@login_required
def change_currency_view(request):
    if request.method == 'POST':
        currency_id = request.POST.get('currency')
        if currency_id:
            try:
                currency = Currency.objects.get(id=currency_id, is_active=True)
                request.user.display_currency = currency
                request.user.save()
                messages.success(request, f'Валюта отображения изменена на {currency.name}')
            except Currency.DoesNotExist:
                messages.error(request, 'Выбранная валюта не найдена')
        return redirect('dashboard')

    currencies = Currency.objects.filter(is_active=True)
    return render(request, 'bank/change_currency.html', {'currencies': currencies})


@require_POST
@login_required
def set_display_currency(request, currency_id):
    try:
        currency = Currency.objects.get(id=currency_id, is_active=True)
        request.user.display_currency = currency
        request.user.save()
        messages.success(request, f'Валюта отображения изменена на {currency.name}')
    except Currency.DoesNotExist:
        messages.error(request, 'Выбранная валюта не найдена')

    return redirect('dashboard')


@login_required
def exchange_rates_view(request):
    """Страница с курсами валют"""
    primary_currency = Currency.objects.filter(is_primary=True, is_active=True).first()

    if not primary_currency:
        messages.error(request, 'Основная валюта не настроена в системе')
        return redirect('dashboard')

    # Все активные валюты кроме основной
    other_currencies = Currency.objects.filter(is_active=True).exclude(id=primary_currency.id)

    # Собираем данные о курсах
    exchange_data = []

    for currency in other_currencies:
        rate_to_ary = ExchangeRate.get_current_rate(currency, primary_currency)
        rate_from_ary = ExchangeRate.get_current_rate(primary_currency, currency)

        exchange_data.append({
            'currency': currency,
            'rate_to_ary': rate_to_ary,
            'rate_from_ary': rate_from_ary,
            'last_update': ExchangeRate.objects.filter(
                from_currency=currency,
                to_currency=primary_currency,
                is_active=True
            ).order_by('-valid_from').first()
        })

    return render(request, 'bank/exchange_rates.html', {
        'primary_currency': primary_currency,
        'exchange_data': exchange_data,
    })


@login_required
def pending_accounts_view(request):
    """Просмотр счетов на рассмотрении"""
    pending_accounts = Account.objects.filter(
        user=request.user,
        status='PENDING',
        is_active=True
    ).select_related('currency').order_by('-created_at')

    context = {
        'pending_accounts': pending_accounts,
        'pending_count': pending_accounts.count(),
    }
    return render(request, 'bank/pending_accounts.html', context)


def is_staff_or_superuser(user):
    """Проверка, является ли пользователь персоналом или суперпользователем"""
    return user.is_staff or user.is_superuser


@user_passes_test(is_staff_or_superuser)
@login_required
def create_government_account_view(request):
    """Создание государственного счета (только для администраторов)"""
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'У вас нет прав для создания государственных счетов')
        return redirect('dashboard')

    if request.method == 'POST':
        form = CreateGovernmentAccountForm(request.POST)
        if form.is_valid():
            try:
                account = form.save()
                messages.success(request,
                    f'Государственный счет успешно создан! Номер: {account.account_number}. '
                    f'Название: {account.account_name}. Баланс: {account.balance} {account.currency.symbol}'
                )
                return redirect('admin:bank_account_changelist')  # Редирект в админку
            except Exception as e:
                messages.error(request, f'Ошибка при создании счета: {str(e)}')
    else:
        form = CreateGovernmentAccountForm()
        # Устанавливаем тип счета по умолчанию для государственных счетов
        form.fields['account_type'].initial = 'GOVERNMENT'

    return render(request, 'bank/create_government_account.html', {
        'form': form,
        'title': 'Создание государственного счета'
    })