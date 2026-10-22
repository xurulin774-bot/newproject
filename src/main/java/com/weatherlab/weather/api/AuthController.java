package com.weatherlab.weather.api;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.weatherlab.weather.admin.UserEntity;
import com.weatherlab.weather.admin.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class AuthController {
    private final UserMapper users;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserMapper users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/api/auth/register")
    public Map<String, Object> register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
        String username = body.username().trim();
        if (!body.password().equals(body.confirmPassword())) {
            throw new IllegalArgumentException("两次输入的密码不一致");
        }
        if (body.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("密码过长，请控制在 72 个 UTF-8 字节以内");
        }
        if (users.selectCount(new QueryWrapper<UserEntity>().eq("username", username)) > 0) {
            throw new IllegalArgumentException("用户名已被注册");
        }

        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(body.password()));
        user.setDisplayName(StringUtils.hasText(body.displayName()) ? body.displayName().trim() : username);
        user.setRole("USER");
        user.setCreatedAt(LocalDateTime.now());
        users.insert(user);

        HttpSession session = request.getSession(true);
        session.setAttribute("userId", user.getId());
        session.setAttribute("username", user.getUsername());
        session.setAttribute("role", user.getRole());
        return Map.of("code", 200, "message", "注册成功", "user", userView(user));
    }

    @PostMapping("/api/auth/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        UserEntity user = users.selectOne(new QueryWrapper<UserEntity>().eq("username", body.username()));
        if (user == null || !passwordEncoder.matches(body.password(), user.getPasswordHash())) {
            throw new SecurityException("Invalid username or password");
        }
        HttpSession session = request.getSession(true);
        session.setAttribute("userId", user.getId());
        session.setAttribute("username", user.getUsername());
        session.setAttribute("role", user.getRole());
        return Map.of("code", 200, "message", "Signed in", "user", userView(user));
    }

    @PostMapping("/api/auth/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return Map.of("code", 200, "message", "Signed out");
    }

    @GetMapping("/api/auth/me")
    public Map<String, Object> me(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("userId") == null) throw new SecurityException("Not signed in");
        UserEntity user = users.selectById((Long) session.getAttribute("userId"));
        if (user == null) throw new SecurityException("Session user no longer exists");
        return Map.of("code", 200, "authenticated", true, "user", userView(user));
    }

    public static Map<String, Object> userView(UserEntity user) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", user.getId()); view.put("username", user.getUsername());
        view.put("display_name", user.getDisplayName()); view.put("role", user.getRole());
        view.put("created_at", user.getCreatedAt());
        return view;
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record RegisterRequest(
            @NotBlank(message = "请输入用户名")
            @Size(min = 3, max = 32, message = "用户名长度应为 3 至 32 位")
            @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "用户名仅允许字母、数字和下划线")
            String username,
            @Size(max = 40, message = "昵称不能超过 40 个字符") String displayName,
            @NotBlank(message = "请输入密码")
            @Size(min = 8, max = 64, message = "密码长度应为 8 至 64 位")
            String password,
            @NotBlank(message = "请再次输入密码") String confirmPassword) {}
}
