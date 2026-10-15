package com.yonder.app.auth.controller;

import java.util.Map;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import com.yonder.app.auth.dto.LoginRequest;
import com.yonder.app.auth.dto.PasswordRequest;
import com.yonder.app.auth.dto.ProfileRequest;
import com.yonder.app.auth.dto.RegisterRequest;
import com.yonder.app.auth.dto.UserDto;
import com.yonder.app.auth.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
@Validated
public class AuthController {
    private final UserService users;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    public AuthController(
            UserService users,
            AuthenticationManager authenticationManager,
            SecurityContextRepository contextRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy) {
        this.users = users;
        this.authenticationManager = authenticationManager;
        this.contextRepository = contextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
    }

    @GetMapping("/auth/csrf")
    Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    @PostMapping("/auth/register")
    UserDto register(@Valid @RequestBody RegisterRequest request) {
        return users.register(request);
    }

    @PostMapping("/auth/login")
    UserDto login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.email().trim().toLowerCase(), request.password()));
        sessionAuthenticationStrategy.onAuthentication(authentication, servletRequest, servletResponse);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, servletRequest, servletResponse);
        return users.getByEmail(authentication.getName());
    }

    @PostMapping("/auth/logout")
    Map<String, String> logout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return Map.of("status", "signed out");
    }

    @GetMapping("/auth/me")
    UserDto currentUser(Authentication authentication) {
        return users.getByEmail(authentication.getName());
    }

    @PutMapping(value = "/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    UserDto uploadProfilePhoto(Authentication authentication, @RequestParam("file") MultipartFile file) {
        return users.uploadProfilePhoto(authentication.getName(), file);
    }

    @GetMapping("/me/photo")
    ResponseEntity<byte[]> getProfilePhoto(Authentication authentication) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.IMAGE_JPEG).body(users.getProfilePhoto(authentication.getName()));
    }

    @DeleteMapping("/me/photo")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void deleteProfilePhoto(Authentication authentication) {
        users.deleteProfilePhoto(authentication.getName());
    }

    @PutMapping("/me")
    UserDto updateProfile(
            Authentication authentication,
            @Valid @RequestBody ProfileRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        UserDto updated = users.updateProfile(authentication.getName(), request);
        Authentication updatedAuthentication = UsernamePasswordAuthenticationToken.authenticated(
                updated.email(), null, authentication.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(updatedAuthentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, servletRequest, servletResponse);
        return updated;
    }

    @PutMapping("/me/password")
    Map<String, String> updatePassword(Authentication authentication, @Valid @RequestBody PasswordRequest request) {
        users.updatePassword(authentication.getName(), request.currentPassword(), request.newPassword());
        return Map.of("status", "password updated");
    }

    @DeleteMapping("/me")
    Map<String, String> deleteAccount(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        users.delete(authentication.getName());
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return Map.of("status", "account deleted");
    }
}
