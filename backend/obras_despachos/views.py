from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Obra, TipoServicio
from .serializers import ObraSerializer, TipoServicioSerializer

class TipoServicioViewSet(viewsets.ModelViewSet):
    queryset = TipoServicio.objects.all()
    serializer_class = TipoServicioSerializer
    permission_classes = [IsAuthenticated]

class ObraViewSet(viewsets.ModelViewSet):
    queryset = Obra.objects.all().order_by('-id_obra')
    serializer_class = ObraSerializer
    permission_classes = [IsAuthenticated]