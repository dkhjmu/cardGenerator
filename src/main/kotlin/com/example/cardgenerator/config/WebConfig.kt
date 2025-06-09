package com.example.cardgenerator.config

import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.Resource
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.resource.PathResourceResolver
import java.io.IOException

@Configuration
class WebConfig : WebMvcConfigurer {

    // 정적 리소스 처리 설정
    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        // API 경로와 정적 리소스 경로는 제외하고 나머지는 index.html로 라우팅
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(object : PathResourceResolver() {
                @Throws(IOException::class)
                override fun getResource(resourcePath: String, location: Resource): Resource {
                    val requestedResource = location.createRelative(resourcePath)
                    
                    // 리소스가 존재하면 해당 리소스 반환, 그렇지 않으면 index.html 반환
                    return if (requestedResource.exists() && requestedResource.isReadable) {
                        requestedResource
                    } else {
                        ClassPathResource("/static/index.html")
                    }
                }
            })
    }
} 