<<<<<<< HEAD
from django.shortcuts import render

# Create your views here.
=======
from rest_framework import viewsets
from .models import Cliente, Proveedor
from .serializers import ClienteSerializer, ProveedorSerializer
from usuarios_rbac.permissions import PermisoClientesProveedores


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by('razon_social')
    serializer_class = ClienteSerializer
    permission_classes = [PermisoClientesProveedores]

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all().order_by('razon_social')
    serializer_class = ProveedorSerializer
    permission_classes = [PermisoClientesProveedores]
>>>>>>> c655e6916b0cda5c9573a4e770885e7deb67bb33
