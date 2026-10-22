package com.weatherlab.weather.api;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.weatherlab.weather.admin.UserEntity;
import com.weatherlab.weather.admin.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {
    @Mock private UserMapper users;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private HttpServletRequest request;
    @Mock private HttpSession session;
    @InjectMocks private AuthController controller;

    @Test
    void registrationHashesPasswordAssignsUserRoleAndStartsSession() {
        when(users.selectCount(any(Wrapper.class))).thenReturn(0L);
        when(passwordEncoder.encode("securePass123")).thenReturn("bcrypt-hash");
        when(request.getSession(true)).thenReturn(session);
        when(users.insert(any(UserEntity.class))).thenAnswer(invocation -> {
            ((UserEntity) invocation.getArgument(0)).setId(42L);
            return 1;
        });

        controller.register(new AuthController.RegisterRequest(
                "new_user", "New User", "securePass123", "securePass123"), request);

        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(users).insert(userCaptor.capture());
        UserEntity created = userCaptor.getValue();
        assertEquals("new_user", created.getUsername());
        assertEquals("New User", created.getDisplayName());
        assertEquals("bcrypt-hash", created.getPasswordHash());
        assertEquals("USER", created.getRole());
        verify(session).setAttribute("userId", 42L);
        verify(session).setAttribute("role", "USER");
    }

    @Test
    void registrationRejectsDuplicateUsername() {
        when(users.selectCount(any(Wrapper.class))).thenReturn(1L);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                controller.register(new AuthController.RegisterRequest(
                        "existing", "", "securePass123", "securePass123"), request));

        assertEquals("用户名已被注册", error.getMessage());
        verify(users, never()).insert(any(UserEntity.class));
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void registrationRejectsMismatchedPasswords() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                controller.register(new AuthController.RegisterRequest(
                        "new_user", "", "securePass123", "otherPass123"), request));

        assertEquals("两次输入的密码不一致", error.getMessage());
        verify(users, never()).insert(any(UserEntity.class));
    }
}
