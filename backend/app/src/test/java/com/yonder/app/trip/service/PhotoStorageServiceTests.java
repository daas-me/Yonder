package com.yonder.app.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PhotoStorageServiceTests {
    private static final String PROJECT_URL = "https://project.supabase.co";
    private static final String API_KEY = "server-only-key";
    private static final String BUCKET = "yonder-photos";

    @Test
    void supabaseStorageUploadsReadsAndDeletesPrivatePhotos() {
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        PhotoStorageService photos = new PhotoStorageService(
                "supabase", "target/test-photos", PROJECT_URL, API_KEY, BUCKET, restClientBuilder);

        server.expect(requestTo(Matchers.matchesPattern(
                        "https://project\\.supabase\\.co/storage/v1/object/yonder-photos/[0-9a-f-]{36}\\.jpg")))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("apikey", API_KEY))
                .andExpect(header("Authorization", "Bearer " + API_KEY))
                .andExpect(header("x-upsert", "true"))
                .andExpect(header("Content-Type", "image/jpeg"))
                .andRespond(withSuccess());

        String key = photos.store(new MockMultipartFile("file", "photo.jpg", "image/jpeg",
                new byte[] { (byte) 0xff, (byte) 0xd8, (byte) 0xff, 0x01 }));
        server.verify();

        String objectUrl = PROJECT_URL + "/storage/v1/object/" + BUCKET + "/" + key + ".jpg";
        byte[] image = new byte[] { (byte) 0xff, (byte) 0xd8, (byte) 0xff, 0x01 };
        server.reset();
        server.expect(requestTo(objectUrl))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("apikey", API_KEY))
                .andExpect(header("Authorization", "Bearer " + API_KEY))
                .andRespond(withSuccess(image, MediaType.IMAGE_JPEG));

        assertThat(photos.read(key)).containsExactly(image);
        server.verify();

        server.reset();
        server.expect(requestTo(PROJECT_URL + "/storage/v1/object/" + BUCKET))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header("apikey", API_KEY))
                .andExpect(header("Authorization", "Bearer " + API_KEY))
                .andExpect(jsonPath("$.prefixes[0]").value(key + ".jpg"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        photos.delete(key);
        server.verify();
    }

    @Test
    void supabaseStorageRequiresServerConfiguration() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new PhotoStorageService(
                "supabase", "target/test-photos", "", "", BUCKET, RestClient.builder()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SUPABASE_URL")
                .hasMessageContaining("SUPABASE_SERVICE_ROLE_KEY");
    }
}
