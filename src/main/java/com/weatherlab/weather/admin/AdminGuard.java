package com.weatherlab.weather.admin;

import jakarta.servlet.http.HttpServletRequest;

public final class AdminGuard {
    private AdminGuard() {}

    public static void require(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null || session.getAttribute("userId") == null) throw new SecurityException("Please sign in first");
        if (!"ADMIN".equals(session.getAttribute("role"))) throw new SecurityException("Administrator role required");
    }
}
