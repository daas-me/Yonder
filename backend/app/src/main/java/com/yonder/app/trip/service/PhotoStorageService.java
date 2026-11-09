package com.yonder.app.trip.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import com.yonder.app.common.ResourceNotFoundException;

@Service
public class PhotoStorageService {
    private static final long MAX_BYTES = 8 * 1024 * 1024;
    private final String provider;
    private final Path directory;
    private final String supabaseApiKey;
    private final String supabaseBucket;
    private final RestClient supabaseClient;

    @Autowired
    public PhotoStorageService(
            @Value("${yonder.storage.provider:local}") String provider,
            @Value("${yonder.storage.photos-directory:./data/photos}") String directory,
            @Value("${yonder.storage.supabase.url:}") String supabaseUrl,
            @Value("${yonder.storage.supabase.service-role-key:}") String supabaseApiKey,
            @Value("${yonder.storage.supabase.bucket:yonder-photos}") String supabaseBucket) {
        this(provider, directory, supabaseUrl, supabaseApiKey, supabaseBucket, RestClient.builder());
    }

    PhotoStorageService(
            String provider, String directory, String supabaseUrl, String supabaseApiKey, String supabaseBucket,
            RestClient.Builder restClientBuilder) {
        this.provider = provider.trim().toLowerCase(Locale.ROOT);
        this.directory = Path.of(directory).toAbsolutePath().normalize();
        this.supabaseApiKey = supabaseApiKey;
        this.supabaseBucket = supabaseBucket;
        if ("supabase".equals(this.provider)) {
            if (supabaseUrl.isBlank() || supabaseApiKey.isBlank() || supabaseBucket.isBlank()) {
                throw new IllegalStateException(
                        "Supabase photo storage requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET");
            }
            this.supabaseClient = restClientBuilder.baseUrl(supabaseUrl).build();
        } else if ("local".equals(this.provider)) {
            this.supabaseClient = null;
        } else {
            throw new IllegalStateException("PHOTO_STORAGE_PROVIDER must be either local or supabase");
        }
    }

    public String store(MultipartFile file) {
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Photo must be between 1 byte and 8 MB");
        }
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length < 3 || (bytes[0] & 0xff) != 0xff || (bytes[1] & 0xff) != 0xd8 || (bytes[2] & 0xff) != 0xff) {
                throw new IllegalArgumentException("Only JPEG photos are supported");
            }
            String key = UUID.randomUUID().toString();
            if ("supabase".equals(provider)) {
                uploadToSupabase(key, bytes);
            } else {
                Files.createDirectories(directory);
                Files.write(directory.resolve(key + ".jpg"), bytes);
            }
            return key;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not store photo", exception);
        }
    }

    public byte[] read(String key) {
        if (key == null || !key.matches("[0-9a-fA-F-]{36}")) {
            throw new ResourceNotFoundException("Photo not found");
        }
        if ("supabase".equals(provider)) {
            try {
                byte[] bytes = supabaseClient.get()
                        .uri("/storage/v1/object/{bucket}/{key}", supabaseBucket, key + ".jpg")
                        .header("apikey", supabaseApiKey)
                        .header("Authorization", "Bearer " + supabaseApiKey)
                        .retrieve()
                        .body(byte[].class);
                if (bytes == null || bytes.length == 0) {
                    throw new IllegalStateException("Supabase Storage returned an empty photo");
                }
                return bytes;
            } catch (RestClientResponseException exception) {
                if (exception.getStatusCode().equals(HttpStatusCode.valueOf(404))) {
                    throw new ResourceNotFoundException("Photo not found");
                }
                throw storageFailure("read", exception);
            }
        }
        try {
            Path path = directory.resolve(key + ".jpg").normalize();
            if (!path.startsWith(directory) || !Files.isRegularFile(path)) {
                throw new ResourceNotFoundException("Photo not found");
            }
            return Files.readAllBytes(path);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read photo", exception);
        }
    }

    public void delete(String key) {
        if (key == null || !key.matches("[0-9a-fA-F-]{36}")) {
            return;
        }
        if ("supabase".equals(provider)) {
            try {
                supabaseClient.method(org.springframework.http.HttpMethod.DELETE)
                        .uri("/storage/v1/object/{bucket}", supabaseBucket)
                        .header("apikey", supabaseApiKey)
                        .header("Authorization", "Bearer " + supabaseApiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("prefixes", List.of(key + ".jpg")))
                        .retrieve()
                        .toBodilessEntity();
                return;
            } catch (RestClientResponseException exception) {
                throw storageFailure("delete", exception);
            }
        }
        try {
            Files.deleteIfExists(directory.resolve(key + ".jpg").normalize());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not delete photo", exception);
        }
    }

    public boolean isPhotoKey(String value) {
        return value != null && value.matches("[0-9a-fA-F-]{36}");
    }

    private void uploadToSupabase(String key, byte[] bytes) {
        try {
            supabaseClient.post()
                    .uri("/storage/v1/object/{bucket}/{key}", supabaseBucket, key + ".jpg")
                    .header("apikey", supabaseApiKey)
                    .header("Authorization", "Bearer " + supabaseApiKey)
                    .header("x-upsert", "true")
                    .contentType(MediaType.IMAGE_JPEG)
                    .body(bytes)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            throw storageFailure("store", exception);
        }
    }

    private IllegalStateException storageFailure(String operation, RestClientResponseException exception) {
        return new IllegalStateException(
                "Could not " + operation + " photo in Supabase Storage (HTTP "
                        + exception.getStatusCode().value() + ")",
                exception);
    }
}
