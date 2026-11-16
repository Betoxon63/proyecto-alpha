import re
from rest_framework import serializers

# Revisa que el RUT sea real y lo devuelva sin puntos para guardarlo ordenado.
def validar_rut(value):
    if not value:
        raise serializers.ValidationError("Debe ingresar el RUT.")

    # Quita los puntos y espacios que se hayan escrito en pantalla.
    rut_limpio = re.sub(r"[^0-9K]", "", str(value).upper())
    if len(rut_limpio) < 8 or len(rut_limpio) > 9:
        raise serializers.ValidationError("El RUT debe tener entre 8 y 9 dígitos.")

    cuerpo = rut_limpio[:-1]
    dv_ingresado = rut_limpio[-1]

    if not cuerpo.isdigit():
        raise serializers.ValidationError("El formato del RUT no es válido.")
    
    suma = 0
    multiplo = 2

    # Cálculo para comprobar el dígito verificador después del guion.
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
        raise serializers.ValidationError("El RUT escrito no es válido. Por favor, revíselo e intente de nuevo.")

    return f"{cuerpo}-{dv_calculado}"

# Impide que se escriban símbolos extraños en los formularios.
def validar_texto(value):
    if value and not re.match(r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.\,\/\_\(\)\°\"\'\#\&\|\:]+$", str(value)):
        raise serializers.ValidationError("El texto contiene símbolos no permitidos.")
    return value