from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Currency, ExchangeRate, TransactionType, Account, Transaction
from django.utils.html import format_html
from django import forms


class AccountForm(forms.ModelForm):
    class Meta:
        model = Account
        fields = '__all__'

    def clean_account_number(self):
        account_number = self.cleaned_data.get('account_number', '').strip().upper()

        # Проверяем, что номер счета состоит только из допустимых символов
        if not all(c.isalnum() for c in account_number):
            raise forms.ValidationError('Номер счета должен содержать только буквы и цифры')

        # Проверяем длину номера счета
        if len(account_number) < 8 or len(account_number) > 20:
            raise forms.ValidationError('Номер счета должен содержать от 8 до 20 символов')

        return account_number


class AccountAdmin(admin.ModelAdmin):
    form = AccountForm
    list_display = (
    'account_number', 'account_type_display', 'owner_display', 'currency', 'balance_display', 'status', 'is_government',
    'created_at')
    list_filter = ('account_type', 'status', 'is_government', 'currency', 'is_active', 'user')
    search_fields = ('account_number', 'account_name', 'user__username', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'balance_display')
    fieldsets = (
        ('Основная информация', {
            'fields': ('account_number', 'account_type', 'currency', 'user', 'account_name', 'is_government')
        }),
        ('Баланс и лимиты', {
            'fields': ('balance', 'credit_limit', 'interest_rate', 'balance_display')
        }),
        ('Статус и активность', {
            'fields': ('status', 'is_active')
        }),
        ('Дополнительная информация', {
            'fields': ('description', 'created_at')
        }),
    )

    def account_type_display(self, obj):
        return obj.get_account_type_display()

    account_type_display.short_description = 'Тип счета'

    def owner_display(self, obj):
        if obj.user:
            return f"{obj.user.get_full_name()} ({obj.user.username})"
        elif obj.account_name:
            return obj.account_name
        return "Без владельца"

    owner_display.short_description = 'Владелец'

    def balance_display(self, obj):
        return obj.get_balance_display()

    balance_display.short_description = 'Баланс'
    balance_display.allow_tags = True

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Для суперпользователя показываем все счета
        if request.user.is_superuser:
            return qs
        # Для обычных администраторов показываем все счета
        return qs

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Добавляем подсказку для поля account_number
        form.base_fields[
            'account_number'].help_text = 'Введите 8-20 символов (буквы и цифры). Для гос. счетов можно задать специальный номер.'
        form.base_fields['user'].help_text = 'Оставьте пустым для государственных счетов'
        form.base_fields['account_name'].help_text = 'Обязательно для счетов без владельца'
        return form

    def save_model(self, request, obj, form, change):
        # Если счет государственный и не указан владелец, устанавливаем флаг
        if not obj.user:
            obj.is_government = True
            if not obj.account_name:
                obj.account_name = f"Государственный счет ({obj.get_account_type_display()})"

        # Если номер счета не указан, генерируем его
        if not obj.account_number:
            from uuid import uuid4
            obj.account_number = uuid4().hex[:16].upper()

        super().save_model(request, obj, form, change)


class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'symbol', 'is_primary', 'is_active', 'created_at')
    list_filter = ('is_primary', 'is_active')
    search_fields = ('name', 'code')
    list_editable = ('is_primary', 'is_active')


class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ('from_currency', 'to_currency', 'rate', 'is_active', 'valid_from', 'valid_to')
    list_filter = ('is_active', 'from_currency', 'to_currency')
    search_fields = ('from_currency__name', 'to_currency__name')


class TransactionTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_positive', 'is_active', 'created_at')
    list_filter = ('is_positive', 'is_active')
    search_fields = ('name', 'code')


class TransactionAdmin(admin.ModelAdmin):
    list_display = (
    'timestamp', 'transaction_type', 'from_account_display', 'to_account_display', 'amount_display', 'is_completed')
    list_filter = ('transaction_type', 'is_completed', 'timestamp')
    search_fields = ('from_account__account_number', 'to_account__account_number', 'description')
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'

    def from_account_display(self, obj):
        if obj.from_account:
            return obj.from_account.account_number
        return "Система"

    from_account_display.short_description = 'Отправитель'

    def to_account_display(self, obj):
        return obj.to_account.account_number

    to_account_display.short_description = 'Получатель'

    def amount_display(self, obj):
        return obj.get_amount_display()

    amount_display.short_description = 'Сумма'
    amount_display.allow_tags = True


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'passport_number', 'display_currency', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Персональная информация',
         {'fields': ('first_name', 'last_name', 'email', 'passport_number', 'phone', 'address', 'birth_date')}),
        ('Настройки банка', {'fields': ('display_currency',)}),
        ('Права доступа', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Важные даты', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'email', 'first_name', 'last_name', 'passport_number'),
        }),
    )
    search_fields = ('username', 'first_name', 'last_name', 'email', 'passport_number')


# Регистрация моделей в админке
admin.site.register(User, CustomUserAdmin)
admin.site.register(Currency, CurrencyAdmin)
admin.site.register(ExchangeRate, ExchangeRateAdmin)
admin.site.register(TransactionType, TransactionTypeAdmin)
admin.site.register(Account, AccountAdmin)
admin.site.register(Transaction, TransactionAdmin)

# Настройка заголовка админки
admin.site.site_header = 'Администрация НацБанка Аргии'
admin.site.site_title = 'НацБанк Аргии'
admin.site.index_title = 'Управление банковской системой'