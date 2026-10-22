package com.weatherlab.weather.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.weatherlab.weather.api.AuthController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
public class UserAdminController {
    private final UserMapper users;
    private final PasswordEncoder passwordEncoder;

    public UserAdminController(UserMapper users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/api/admin/users")
    public Map<String, Object> list(HttpServletRequest request, @RequestParam(defaultValue = "1") long page,
                                    @RequestParam(defaultValue = "20") long size) {
        AdminGuard.require(request);
        Page<UserEntity> result = users.selectPage(new Page<>(Math.max(1, page), Math.min(100, Math.max(1, size))),
                new QueryWrapper<UserEntity>().orderByDesc("id"));
        return Map.of("items", result.getRecords().stream().map(AuthController::userView).toList(),
                "total", result.getTotal(), "page", result.getCurrent(), "size", result.getSize());
    }

    @PostMapping("/api/admin/users")
    public Map<String, Object> create(HttpServletRequest request, @Valid @RequestBody UserRequest body) {
        AdminGuard.require(request);
        if (users.selectCount(new QueryWrapper<UserEntity>().eq("username", body.username())) > 0)
            throw new IllegalArgumentException("Username already exists");
        UserEntity user = new UserEntity();
        user.setUsername(body.username()); user.setPasswordHash(passwordEncoder.encode(body.password()));
        user.setDisplayName(body.displayName()); user.setRole(body.role()); user.setCreatedAt(LocalDateTime.now());
        users.insert(user);
        return Map.of("item", AuthController.userView(user));
    }

    @PutMapping("/api/admin/users/{id}")
    public Map<String, Object> update(HttpServletRequest request, @PathVariable long id,
                                      @Valid @RequestBody UserUpdateRequest body) {
        AdminGuard.require(request);
        UserEntity user = require(id);
        user.setDisplayName(body.displayName()); user.setRole(body.role());
        if (body.password() != null && !body.password().isBlank()) user.setPasswordHash(passwordEncoder.encode(body.password()));
        users.updateById(user);
        return Map.of("item", AuthController.userView(user));
    }

    @DeleteMapping("/api/admin/users/{id}")
    public Map<String, Object> delete(HttpServletRequest request, @PathVariable long id) {
        AdminGuard.require(request);
        UserEntity user = require(id);
        if ("ADMIN".equals(user.getRole()) && users.selectCount(new QueryWrapper<UserEntity>().eq("role_name", "ADMIN")) <= 1)
            throw new IllegalArgumentException("The last administrator cannot be deleted");
        users.deleteById(id);
        return Map.of("code", 200, "message", "User deleted");
    }

    private UserEntity require(long id) {
        UserEntity user = users.selectById(id);
        if (user == null) throw new NoSuchElementException("User not found: " + id);
        return user;
    }

    public record UserRequest(@NotBlank @Size(max = 64) String username,
                              @NotBlank @Size(min = 6, max = 100) String password,
                              @NotBlank @Size(max = 100) String displayName,
                              @NotBlank @Size(max = 32) String role) {}
    public record UserUpdateRequest(@NotBlank @Size(max = 100) String displayName,
                                    @NotBlank @Size(max = 32) String role,
                                    @Size(min = 6, max = 100) String password) {}
}
