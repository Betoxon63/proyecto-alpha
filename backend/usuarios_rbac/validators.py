import re
from rest_framework import serializers


def validar_rut(value):
    # Validación del RUT aplicando el algoritmo Módulo 11.
    if not value:
        raise serializers.ValidationError("El RUT es obligatorio.")

    rut_limpio = value.upper().replace(".", "").replace(" ", "")
    if not re.match(r"^\d{7,8}-[0-9K]$", rut_limpio):
        raise serializers.ValidationError("El RUT no tiene un formato válido.")

    cuerpo, dv_ingresado = rut_limpio.split("-")
    suma = 0
    multiplo = 2

    for digito in reversed(cuerpo):
        suma += int(digito) * multiplo
        multiplo = 2 if multiplo == 7 else multiplo + 1

    resto = 11 - (suma % 11)
    if resto == 11:
        dv_calculado = "0"
    elif resto == 10:
        dv_calculado = "K"
    else:
        dv_calculado = str(resto)

    if dv_ingresado != dv_calculado:
        raise serializers.ValidationError("El RUT ingresado no es válido.")

    return f"{cuerpo}-{dv_calculado}"

def validar_texto(value):
    # Bloquea caracteres especiales.
    if value and not re.match(r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.\,\/\_\(\)\°\"\'\#\&]+$", str(value)):
        raise serializers.ValidationError("El texto contiene caracteres o símbolos no permitidos.")
    return value