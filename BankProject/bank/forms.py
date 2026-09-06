from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth import get_user_model
from .models import Account, Transaction, TransactionType, Currency, ExchangeRate
from decimal import Decimal

User = get_user_model()


class LoginForm(AuthenticationForm):
    username = forms.CharField(widget=forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Введите логин'
    }))
    password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control',
        'placeholder': 'Введите пароль'
    }))


class RegisterForm(UserCreationForm):
    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={
        'class': 'form-control',
        'placeholder': 'Введите email'
    }))
    first_name = forms.CharField(max_length=30, required=True, widget=forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Введите имя'
    }))
    last_name = forms.CharField(max_length=30, required=True, widget=forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Введите фамилию'
    }))
    passport_number = forms.CharField(max_length=25, required=True, widget=forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Введите номер паспорта (формат: 000000000000-000000000000)'
    }))
    phone = forms.CharField(max_length=15, required=False, widget=forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Введите телефон'
    }))
    display_currency = forms.ModelChoiceField(
        queryset=Currency.objects.filter(is_active=True),
        required=False,
        label='Валюта отображения',
        help_text='Выберите валюту, в которой хотите видеть свои счета',
        widget=forms.Select(attrs={'class': 'form-control'})
    )

    class Meta:
        model = User
        fields = (
            'username', 'email', 'first_name', 'last_name', 'passport_number', 'phone', 'display_currency', 'password1',
            'password2')

    def clean_passport_number(self):
        passport_number = self.cleaned_data['passport_number']
        import re
        if not re.match(r'^\d{12}-\d{12}$', passport_number):
            raise forms.ValidationError(
                'Введите номер паспорта в формате: 000000000000-000000000000 (12 цифр, дефис, 12 цифр)')
        return passport_number

    def save(self, commit=True):
        user = super().save(commit=False)
        user.passport_number = self.cleaned_data['passport_number']
        user.phone = self.cleaned_data['phone']

        # Устанавливаем валюту отображения, если выбрана
        if self.cleaned_data['display_currency']:
            user.display_currency = self.cleaned_data['display_currency']
        else:
            # Иначе устанавливаем основную валюту
            primary_currency = Currency.objects.filter(is_primary=True, is_active=True).first()
            if primary_currency:
                user.display_currency = primary_currency

        if commit:
            user.save()
            # Создаем начальный расчетный счет для пользователя с нулевым балансом (активный сразу)
            Account.objects.create(
                user=user,
                account_type='CHECKING',
                currency=user.display_currency or Currency.objects.filter(is_primary=True, is_active=True).first(),
                balance=0.00,
                status='ACTIVE'  # Первый счет активен сразу
            )
        return user


class TransferForm(forms.Form):
    from_account = forms.ModelChoiceField(
        queryset=Account.objects.none(),
        label="Счет списания",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    to_account_number = forms.CharField(
        max_length=20,
        label="Номер счета получателя",
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Введите номер счета'})
    )
    amount = forms.DecimalField(
        max_digits=30,
        decimal_places=15,
        label="Сумма",
        min_value=Decimal('0.0000000001'),
        widget=forms.NumberInput(attrs={'class': 'form-control', 'step': 'any'})
    )
    description = forms.CharField(
        max_length=200,
        required=False,
        label="Описание",
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 2})
    )

    def __init__(self, user, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Показываем только активные счета пользователя со статусом ACTIVE
        self.fields['from_account'].queryset = Account.objects.filter(
            user=user, is_active=True, status='ACTIVE'
        ).select_related('currency')

    def clean(self):
        cleaned_data = super().clean()

        # Получаем значения из cleaned_data
        from_account = cleaned_data.get('from_account')
        amount = cleaned_data.get('amount')
        to_account_number = cleaned_data.get('to_account_number')

        print(f"DEBUG FORM: from_account={from_account}, amount={amount}, to_account_number={to_account_number}")

        # Проверяем, что все обязательные поля есть
        if not from_account or not amount or not to_account_number:
            return cleaned_data

        # Проверяем счет отправителя
        if from_account.status == 'FROZEN' or not from_account.is_active:
            raise forms.ValidationError("Счет отправителя заморожен или не активен")

        # Проверяем достаточно ли средств (с учетом высокой точности)
        if not from_account.can_withdraw(amount):
            raise forms.ValidationError(
                f"Недостаточно средств. На счете: {from_account.balance:.15f} {from_account.currency.symbol}"
            )

        # Ищем счет получателя
        try:
            to_account = Account.objects.get(account_number=to_account_number)
            print(f"DEBUG FORM: Found to_account: {to_account.account_number}")

            if to_account.status == 'FROZEN' or not to_account.is_active:
                raise forms.ValidationError("Счет получателя заморожен или не активен")

            if to_account.status == 'PENDING':
                raise forms.ValidationError("Нельзя перевести деньги на счет, который находится на рассмотрении")

            if from_account == to_account:
                raise forms.ValidationError("Нельзя перевести деньги на тот же счет")

            # Разрешаем перевод на счета без владельца (государственные счета)
            # Если у счета есть владелец, проверяем, что он активен
            if to_account.user and to_account.user.is_active == False:
                raise forms.ValidationError("Владелец счета получателя не активен")

            # ВАЖНО: добавляем to_account в cleaned_data
            cleaned_data['to_account'] = to_account

        except Account.DoesNotExist:
            raise forms.ValidationError("Счет получателя не найден")

        return cleaned_data


class OpenAccountForm(forms.Form):
    ACCOUNT_TYPE_CHOICES = [
        ('CHECKING', 'Основной (расчетный)'),
        ('SAVINGS', 'Накопительный'),
    ]

    account_type = forms.ChoiceField(
        choices=ACCOUNT_TYPE_CHOICES,
        label="Тип счета",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    currency = forms.ModelChoiceField(
        queryset=Currency.objects.filter(is_active=True),
        label="Валюта счета",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    initial_deposit = forms.DecimalField(
        max_digits=30,
        decimal_places=15,
        label="Начальный взнос",
        min_value=Decimal('0.00'),
        required=False,
        initial=Decimal('0.00'),
        widget=forms.NumberInput(attrs={'class': 'form-control', 'step': 'any'})
    )

    def __init__(self, user, *args, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super().clean()
        initial_deposit = cleaned_data.get('initial_deposit', Decimal('0.00'))

        # Проверяем количество счетов на рассмотрении
        pending_accounts_count = Account.objects.filter(
            user=self.user,
            status='PENDING',
            is_active=True
        ).count()

        if pending_accounts_count >= 2:
            raise forms.ValidationError(
                "У вас уже есть 2 счета на рассмотрении. Новые счета нельзя открывать, пока предыдущие не будут активированы."
            )

        # Если начальный взнос больше 0, проверяем возможность списания
        if initial_deposit and initial_deposit > Decimal('0.00'):
            # Ищем любой активный счет с достаточным балансом
            accounts = Account.objects.filter(
                user=self.user,
                is_active=True,
                status='ACTIVE'
            ).select_related('currency')

            target_currency = cleaned_data.get('currency')
            can_afford = False

            print(f"=== CLEAN FORM: Проверка возможности списания ===")
            print(f"  Сумма: {initial_deposit:.15f} {target_currency.symbol if target_currency else '?'}")
            print(f"  Всего счетов у пользователя: {accounts.count()}")

            for account in accounts:
                print(f"  Проверка счета {account.account_number}: {account.balance:.15f} {account.currency.code}")

                if account.currency == target_currency:
                    if account.balance >= initial_deposit:
                        can_afford = True
                        print(f"    ✓ Достаточно средств (та же валюта)")
                        break
                else:
                    rate = ExchangeRate.get_current_rate(account.currency, target_currency)
                    print(f"    Курс {account.currency.code}→{target_currency.code}: {rate}")
                    if rate:
                        required_amount = initial_deposit / rate
                        if account.balance >= required_amount:
                            can_afford = True
                            print(f"    ✓ Достаточно средств (с конвертацией)")
                            break

            if not can_afford:
                print(f"  ✗ Недостаточно средств на всех счетах")
                raise forms.ValidationError(
                    "Недостаточно средств на активных счетах для начального взноса"
                )

        return cleaned_data


class CurrencyPreferenceForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['display_currency']
        widgets = {
            'display_currency': forms.Select(attrs={'class': 'form-control'})
        }
        labels = {
            'display_currency': 'Валюта отображения'
        }
        help_texts = {
            'display_currency': 'Выберите валюту, в которой хотите видеть свои счета'
        }


class CreateGovernmentAccountForm(forms.ModelForm):
    """Форма для создания государственных счетов (только для администраторов)"""

    class Meta:
        model = Account
        fields = ['account_number', 'account_type', 'currency', 'account_name', 'balance', 'description']
        widgets = {
            'account_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Введите номер счета'}),
            'account_type': forms.Select(attrs={'class': 'form-control'}),
            'currency': forms.Select(attrs={'class': 'form-control'}),
            'account_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Введите название счета'}),
            'balance': forms.NumberInput(attrs={'class': 'form-control', 'step': 'any'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }
        labels = {
            'account_number': 'Номер счета',
            'account_type': 'Тип счета',
            'currency': 'Валюта',
            'account_name': 'Название счета',
            'balance': 'Начальный баланс',
            'description': 'Описание',
        }
        help_texts = {
            'account_number': '8-20 символов. Если оставить пустым, будет сгенерирован автоматически.',
            'account_name': 'Обязательно для государственных счетов',
        }

    def clean_account_number(self):
        account_number = self.cleaned_data.get('account_number', '').strip().upper()

        if account_number:
            # Проверяем, что номер счета состоит только из допустимых символов
            if not all(c.isalnum() for c in account_number):
                raise forms.ValidationError('Номер счета должен содержать только буквы и цифры')

            # Проверяем длину номера счета
            if len(account_number) < 8 or len(account_number) > 20:
                raise forms.ValidationError('Номер счета должен содержать от 8 до 20 символов')

            # Проверяем уникальность номера счета
            if Account.objects.filter(account_number=account_number).exists():
                raise forms.ValidationError('Счет с таким номером уже существует')

        return account_number

    def save(self, commit=True):
        account = super().save(commit=False)
        account.is_government = True
        account.status = 'ACTIVE'
        account.is_active = True

        if not account.account_number:
            from uuid import uuid4
            account.account_number = uuid4().hex[:16].upper()

        if commit:
            account.save()

        return account