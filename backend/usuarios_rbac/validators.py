import re
from rest_framework import serializers


# Verifica que el RUT sea auténtico mediante el cálculo del dígito verificador.
def validar_rut(value):
    if not value:
        raise serializers.ValidationError("Debe ingresar el RUT.")

    # Elimina puntos, guiones y espacios, dejando solo números y la letra K en mayúscula.
    rut_limpio = re.sub(r"[^0-9K]", "", str(value).upper())
    if len(rut_limpio) < 8 or len(rut_limpio) > 9:
        raise serializers.ValidationError("El RUT debe tener entre 8 y 9 dígitos.")

    # Separa el cuerpo numérico del último carácter.
    cuerpo = rut_limpio[:-1]
    dv_ingresado = rut_limpio[-1]

    if not cuerpo.isdigit():
        raise serializers.ValidationError("El formato del RUT no es válido.")

    # Recorre los números de derecha a izquierda multiplicándolos del 2 al 7 de forma cíclica.
    suma = 0
    multiplo = 2
    for digito in reversed(cuerpo):
        suma += int(digito) * multiplo
        multiplo = 2 if multiplo == 7 else multiplo + 1

    # Calcula el dígito verificador esperado según la regla oficial de Módulo 11.
    resto = 11 - (suma % 11)
    if resto == 11:
        dv_calculado = "0"
    elif resto == 10:
        dv_calculado = "K"
    else:
        dv_calculado = str(resto)

    if dv_ingresado != dv_calculado:
        raise serializers.ValidationError(
            "El RUT escrito no es válido. Por favor, revíselo e intente de nuevo."
        )

    return f"{cuerpo}-{dv_calculado}"


# Verifica que los textos ingresados no contengan caracteres peligrosos.
def validar_texto(value):
    if value and not re.match(r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.\,\/\_\(\)\°\"\'\#\&\|\:]+$", str(value)):
        raise serializers.ValidationError("El texto contiene símbolos no permitidos.")
    return value
