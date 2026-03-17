package com.nabin.seogeo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SeoGeoApplication {

	public static void main(String[] args) {
		SpringApplication.run(SeoGeoApplication.class, args);
	}

}
