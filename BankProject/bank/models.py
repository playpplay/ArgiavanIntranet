from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator, MinValueValidator
from decimal import Decimal
import uuid
from django.utils import timezone


class User(AbstractUser):
    passport_number = models.CharField(
        max_length=25,
        verbose_name='Паспортные данные',
        help_text='Номер паспорта в формате: 000000000000-000000000000',
        validators=[
            RegexValidator(
                regex=r'^\d{12}-\d{12}$',
                message='Введите номер паспорта в формате: 000000000000-000000000000 (12 цифр, дефис, 12 цифр)'
            )
        ]
    )

    phone = models.CharField(
        max_length=15,
        verbose_name='Телефон',
        blank=True,
        null=True
    )

    address = models.TextField(
        verbose_name='Адрес',
        blank=True,
        null=True
    )

    birth_date = models.DateField(
        verbose_name='Дата рождения',
        blank=True,
        null=True
    )

    display_currency = models.ForeignKey(
        'Currency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Валюта отображения',
        help_text='Валюта, в которой пользователь видит свои счета'
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'


class Currency(models.Model):
    """Модель для хранения информации о валютах"""
    name = models.CharField(max_length=100, verbose_name='Название валюты')
    code = models.CharField(max_length=10, unique=True, verbose_name='Код валюты')
    symbol = models.CharField(max_length=10, verbose_name='Символ валюты')
    is_primary = models.BooleanField(default=False, verbose_name='Основная валюта')
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Валюта'
        verbose_name_plural = 'Валюты'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code}) - {self.symbol}"

    def save(self, *args, **kwargs):
        # Если эта валюта помечена как основная, снимаем флаг с других валют
        if self.is_primary:
            Currency.objects.filter(is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)


class ExchangeRate(models.Model):
    """Модель для хранения курсов валют"""
    from_currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        related_name='from_rates',
        verbose_name='Исходная валюта'
    )
    to_currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        related_name='to_rates',
        verbose_name='Целевая валюта'
    )
    rate = models.DecimalField(
        max_digits=30,
        decimal_places=15,
        verbose_name='Курс обмена',
        validators=[MinValueValidator(Decimal('0.000000000000001'))]
    )
    is_active = models.BooleanField(default=True, verbose_name='Активный курс')
    valid_from = models.DateTimeField(default=timezone.now, verbose_name='Действует с')
    valid_to = models.DateTimeField(null=True, blank=True, verbose_name='Действует до')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Курс валюты'
        verbose_name_plural = 'Курсы валют'
        ordering = ['-valid_from']
        unique_together = ['from_currency', 'to_currency', 'valid_from']

    def __str__(self):
        return f"1 {self.from_currency.code} = {self.rate} {self.to_currency.code}"

    @classmethod
    def get_current_rate(cls, from_currency, to_currency, visited_pairs=None):
        """Получение текущего курса с защитой от рекурсии"""
        if from_currency == to_currency:
            return Decimal('1.0')

        # Инициализация множества для отслеживания уже проверенных пар
        if visited_pairs is None:
            visited_pairs = set()

        pair_key = (from_currency.id, to_currency.id) if hasattr(from_currency, 'id') else (
            str(from_currency), str(to_currency))

        # Защита от рекурсии
        if pair_key in visited_pairs:
            return None
        visited_pairs.add(pair_key)

        now = timezone.now()

        # Пытаемся найти прямой курс
        rate = cls.objects.filter(
            from_currency=from_currency,
            to_currency=to_currency,
            is_active=True,
            valid_from__lte=now
        ).filter(
            models.Q(valid_to__gte=now) | models.Q(valid_to__isnull=True)
        ).order_by('-valid_from').first()

        if rate:
            return rate.rate

        # Пытаемся найти обратный курс
        reverse_rate = cls.objects.filter(
            from_currency=to_currency,
            to_currency=from_currency,
            is_active=True,
            valid_from__lte=now
        ).filter(
            models.Q(valid_to__gte=now) | models.Q(valid_to__isnull=True)
        ).order_by('-valid_from').first()

        if reverse_rate:
            return Decimal('1.0') / reverse_rate.rate

        # Пытаемся найти путь через основную валюту
        primary_currency = Currency.objects.filter(is_primary=True, is_active=True).first()

        if primary_currency and primary_currency != from_currency and primary_currency != to_currency:
            # Получаем курс от исходной к основной валюте
            rate1 = cls.get_current_rate(from_currency, primary_currency, visited_pairs.copy())
            # Получаем курс от основной к целевой валюте
            rate2 = cls.get_current_rate(primary_currency, to_currency, visited_pairs.copy())

            if rate1 and rate2:
                return rate1 * rate2

        return None


class TransactionType(models.Model):
    """Модель для типов транзакций (управляемая через админку)"""
    name = models.CharField(max_length=100, verbose_name='Название типа')
    code = models.CharField(max_length=50, unique=True, verbose_name='Код типа')
    description = models.TextField(blank=True, verbose_name='Описание')
    is_positive = models.BooleanField(default=True, verbose_name='Увеличивает баланс')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Тип транзакции'
        verbose_name_plural = 'Типы транзакций'

    def __str__(self):
        return self.name


def generate_account_number():
    return uuid.uuid4().hex[:16].upper()


class Account(models.Model):
    ACCOUNT_TYPES = [
        ('CHECKING', 'Основной (расчетный)'),
        ('SAVINGS', 'Накопительный'),
        ('CREDIT', 'Кредитный'),
        ('TAX', 'Налоговый'),
        ('DEPOSIT', 'Депозитный'),
        ('GOVERNMENT', 'Государственный'),
        ('RESERVE', 'Резервный'),
        ('TREASURY', 'Казначейский'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Активен'),
        ('PENDING', 'На рассмотрении'),
        ('FROZEN', 'Заморожен'),
        ('CLOSED', 'Закрыт'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='accounts',
        null=True,  # Разрешаем null для счетов без владельца
        blank=True,  # Разрешаем пустое значение
        verbose_name='Владелец счета'
    )
    account_number = models.CharField(
        max_length=20,
        unique=True,
        default=generate_account_number,
        verbose_name='Номер счета',
        help_text='16-значный номер счета. Если оставить пустым, будет сгенерирован автоматически.'
    )
    account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPES, default='CHECKING')
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT, verbose_name='Валюта счета')
    balance = models.DecimalField(max_digits=30, decimal_places=15, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    credit_limit = models.DecimalField(max_digits=30, decimal_places=15, default=0.00)
    interest_rate = models.DecimalField(max_digits=10, decimal_places=5, default=0.00, help_text='Процентная ставка')

    # Дополнительные поля для государственных счетов
    account_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='Название счета',
        help_text='Для государственных счетов: название организации или назначение счета'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Описание счета',
        help_text='Дополнительная информация о счете'
    )
    is_government = models.BooleanField(
        default=False,
        verbose_name='Государственный счет',
        help_text='Отметьте, если это государственный или бюджетный счет'
    )

    class Meta:
        verbose_name = 'Счет'
        verbose_name_plural = 'Счета'

    def __str__(self):
        if self.user:
            return f"{self.account_number} - {self.get_account_type_display()} ({self.user.username})"
        else:
            account_name = self.account_name or f"Без владельца ({self.get_account_type_display()})"
            return f"{self.account_number} - {account_name}"

    def save(self, *args, **kwargs):
        # Если это государственный счет, устанавливаем соответствующий флаг
        if self.account_type in ['GOVERNMENT', 'RESERVE', 'TREASURY', 'TAX']:
            self.is_government = True

        # Если счет государственный, устанавливаем статус ACTIVE по умолчанию
        if self.is_government and not self.status:
            self.status = 'ACTIVE'

        # Если не указано название счета для счета без владельца, создаем его
        if not self.user and not self.account_name:
            self.account_name = f"Гос. счет: {self.get_account_type_display()}"

        super().save(*args, **kwargs)

    def get_balance_in_currency(self, target_currency):
        if self.currency == target_currency:
            return self.balance

        rate = ExchangeRate.get_current_rate(self.currency, target_currency)
        if rate:
            return self.balance * rate
        return None  # Возвращаем None вместо 0, чтобы отличить "нет курса" от "баланс 0"

    def available_balance(self):
        if self.account_type == 'CREDIT':
            return self.balance + self.credit_limit
        return self.balance

    def can_withdraw(self, amount):
        return self.available_balance() >= amount

    def freeze(self):
        """Заморозить счет"""
        if self.status == 'ACTIVE':
            self.status = 'FROZEN'
            self.save()
            return True
        return False

    def can_be_frozen(self):
        """Можно ли заморозить счет"""
        return self.status == 'ACTIVE' and self.is_active

    def get_balance_display(self, target_currency=None):
        """Отображение баланса с указанием валюты"""
        if target_currency is None:
            target_currency = self.currency

        balance = self.get_balance_in_currency(target_currency)
        symbol = target_currency.symbol

        if balance is None:
            return "Нет курса"

        if balance < Decimal('0'):
            return f'<span style="color: red;">{balance:.15f} {symbol}</span>'
        elif balance == Decimal('0'):
            return f'{balance} {symbol}'
        else:
            return f'<span style="color: green;">{balance:.15f} {symbol}</span>'

    get_balance_display.allow_tags = True
    get_balance_display.short_description = 'Баланс'

    def is_owned_by_user(self):
        """Проверяет, принадлежит ли счет пользователю"""
        return self.user is not None

    def get_owner_display(self):
        """Отображает владельца счета"""
        if self.user:
            return f"{self.user.get_full_name()} ({self.user.username})"
        elif self.account_name:
            return self.account_name
        else:
            return "Без владельца (государственный)"


class Transaction(models.Model):
    from_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='sent_transactions',
        null=True,
        blank=True,
        verbose_name='Счет отправителя'
    )
    to_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='received_transactions',
        verbose_name='Счет получателя'
    )
    transaction_type = models.ForeignKey(
        TransactionType,
        on_delete=models.PROTECT,
        verbose_name='Тип транзакции'
    )
    amount = models.DecimalField(max_digits=30, decimal_places=15, verbose_name='Сумма')
    original_amount = models.DecimalField(
        max_digits=30,
        decimal_places=15,
        verbose_name='Сумма в валюте счета',
        help_text='Сумма в валюте счета отправителя/получателя'
    )
    exchange_rate = models.DecimalField(
        max_digits=30,
        decimal_places=15,
        null=True,
        blank=True,
        verbose_name='Курс обмена',
        help_text='Курс обмена при конвертации валют'
    )
    description = models.CharField(max_length=200, blank=True, verbose_name='Описание')
    timestamp = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=True, verbose_name='Завершена')

    class Meta:
        verbose_name = 'Транзакция'
        verbose_name_plural = 'Транзакции'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.transaction_type.name}: {self.amount:.15f} ({self.timestamp})"

    def save(self, *args, **kwargs):
        # Если это перевод между счетами в разных валютах, вычисляем курс
        if self.from_account and self.to_account and self.from_account.currency != self.to_account.currency:
            rate = ExchangeRate.get_current_rate(self.from_account.currency, self.to_account.currency)
            if rate:
                self.exchange_rate = rate
                # Сохраняем оригинальную сумму в валюте счета
                self.original_amount = self.amount / rate if self.from_account else self.amount
        else:
            self.original_amount = self.amount

        super().save(*args, **kwargs)

    def get_amount_display(self, target_currency=None):
        """Отображение суммы с указанием валюты"""
        if target_currency:
            # Конвертируем в целевую валюту
            if self.from_account:
                rate = ExchangeRate.get_current_rate(self.from_account.currency, target_currency)
                if rate:
                    amount = self.amount * rate
                    return f"{amount:.15f} {target_currency.symbol}"

        # Возвращаем в оригинальной валюте
        if self.from_account:
            return f"{self.amount:.15f} {self.from_account.currency.symbol}"
        elif self.to_account:
            return f"{self.amount:.15f} {self.to_account.currency.symbol}"

        return f"{self.amount:.15f}"

    get_amount_display.short_description = 'Сумма'