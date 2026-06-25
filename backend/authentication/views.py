from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, RegisterSerializer

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(is_active=True)


class ChangePasswordView(APIView):
    """Logged-in user changes their own password (verifies the current one)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old = request.data.get('old_password') or ''
        new = request.data.get('new_password') or ''
        if not request.user.check_password(old):
            return Response({'error': 'Current password is wrong'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new) < 6:
            return Response({'error': 'New password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new)
        request.user.save()
        return Response({'ok': True})
