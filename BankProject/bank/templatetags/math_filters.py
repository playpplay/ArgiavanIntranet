from django import template

register = template.Library()

@register.filter
def multiply(value, arg):
    """Умножает значение на аргумент"""
    try:
        return float(value) * float(arg)
    except (ValueError, TypeError):
        return value

@register.filter(name='get_rate')
def get_rate(exchange_rate_obj, from_currency):
    """Получает курс от заданной валюты"""
    # Это заглушка для примера
    return exchange_rate_obj