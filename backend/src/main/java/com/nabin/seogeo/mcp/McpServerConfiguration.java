package com.nabin.seogeo.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.modelcontextprotocol.json.McpJsonMapper;
import io.modelcontextprotocol.json.jackson2.JacksonMcpJsonMapper;
import io.modelcontextprotocol.json.schema.JsonSchemaValidator;
import io.modelcontextprotocol.json.schema.jackson2.DefaultJsonSchemaValidator;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.transport.HttpServletStreamableServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.common.McpTransportContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class McpServerConfiguration {

    private static final String MCP_ENDPOINT = "/mcp";

    @Bean
    McpJsonMapper mcpJsonMapper(ObjectMapper objectMapper) {
        ObjectMapper mcpObjectMapper = objectMapper.copy();
        mcpObjectMapper.registerModule(new JavaTimeModule());
        return new JacksonMcpJsonMapper(mcpObjectMapper);
    }

    @Bean
    JsonSchemaValidator mcpJsonSchemaValidator(ObjectMapper objectMapper) {
        ObjectMapper validatorObjectMapper = objectMapper.copy();
        validatorObjectMapper.registerModule(new JavaTimeModule());
        return new DefaultJsonSchemaValidator(validatorObjectMapper);
    }

    @Bean
    HttpServletStreamableServerTransportProvider mcpTransportProvider(McpJsonMapper mcpJsonMapper) {
        return HttpServletStreamableServerTransportProvider.builder()
                .jsonMapper(mcpJsonMapper)
                .mcpEndpoint(MCP_ENDPOINT)
                .contextExtractor(this::extractTransportContext)
                .build();
    }

    @Bean
    ServletRegistrationBean<HttpServletStreamableServerTransportProvider> mcpServletRegistration(
            HttpServletStreamableServerTransportProvider transportProvider
    ) {
        ServletRegistrationBean<HttpServletStreamableServerTransportProvider> registration =
                new ServletRegistrationBean<>(transportProvider, MCP_ENDPOINT);
        registration.setName("seogeoMcpServlet");
        registration.setLoadOnStartup(1);
        return registration;
    }

    @Bean(destroyMethod = "closeGracefully")
    McpSyncServer mcpSyncServer(
            HttpServletStreamableServerTransportProvider transportProvider,
            McpJsonMapper mcpJsonMapper,
            JsonSchemaValidator mcpJsonSchemaValidator,
            McpToolHandlerService mcpToolHandlerService,
            @Value("${spring.application.version:0.0.1-SNAPSHOT}") String applicationVersion
    ) {
        return McpServer.sync(transportProvider)
                .jsonMapper(mcpJsonMapper)
                .jsonSchemaValidator(mcpJsonSchemaValidator)
                .serverInfo("seogeo", applicationVersion)
                .capabilities(McpSchema.ServerCapabilities.builder().tools(false).build())
                .tools(
                        projectsListSpecification(mcpJsonMapper, mcpToolHandlerService),
                        projectGetSpecification(mcpJsonMapper, mcpToolHandlerService),
                        projectAuditsListSpecification(mcpJsonMapper, mcpToolHandlerService),
                        auditStartSpecification(mcpJsonMapper, mcpToolHandlerService),
                        auditReportGetSpecification(mcpJsonMapper, mcpToolHandlerService)
                )
                .build();
    }

    private McpServerFeatures.SyncToolSpecification projectsListSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService
    ) {
        return McpServerFeatures.SyncToolSpecification.builder()
                .tool(McpSchema.Tool.builder()
                        .name("projects_list")
                        .title("List Projects")
                        .description("List projects visible to the authenticated SEOGEO account.")
                        .inputSchema(jsonMapper, """
                                {
                                  "type": "object",
                                  "properties": {},
                                  "additionalProperties": false
                                }
                                """)
                        .outputSchema(jsonMapper, """
                                {
                                  "type": "array",
                                  "items": {
                                    "type": "object"
                                  }
                                }
                                """)
                        .build())
                .callHandler(toolHandlerService::projectsList)
                .build();
    }

    private McpServerFeatures.SyncToolSpecification projectGetSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService
    ) {
        return toolSpecification(
                jsonMapper,
                "project_get",
                "Get Project",
                "Read one project visible to the authenticated SEOGEO account.",
                """
                        {
                          "type": "object",
                          "properties": {
                            "slug": {
                              "type": "string"
                            }
                          },
                          "required": ["slug"],
                          "additionalProperties": false
                        }
                        """,
                objectOutputSchema(),
                toolHandlerService::projectGet
        );
    }

    private McpServerFeatures.SyncToolSpecification projectAuditsListSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService
    ) {
        return toolSpecification(
                jsonMapper,
                "project_audits_list",
                "List Project Audits",
                "List audit history for one project visible to the authenticated SEOGEO account.",
                """
                        {
                          "type": "object",
                          "properties": {
                            "projectSlug": {
                              "type": "string"
                            },
                            "trackedUrl": {
                              "type": "string"
                            }
                          },
                          "required": ["projectSlug"],
                          "additionalProperties": false
                        }
                        """,
                """
                        {
                          "type": "array",
                          "items": {
                            "type": "object"
                          }
                        }
                        """,
                toolHandlerService::projectAuditsList
        );
    }

    private McpServerFeatures.SyncToolSpecification auditStartSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService
    ) {
        return toolSpecification(
                jsonMapper,
                "audit_start",
                "Start Audit",
                "Start an owned SEOGEO audit for the authenticated account.",
                """
                        {
                          "type": "object",
                          "properties": {
                            "url": {
                              "type": "string"
                            },
                            "projectSlug": {
                              "type": "string"
                            }
                          },
                          "required": ["url"],
                          "additionalProperties": false
                        }
                        """,
                objectOutputSchema(),
                toolHandlerService::auditStart
        );
    }

    private McpServerFeatures.SyncToolSpecification auditReportGetSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService
    ) {
        return toolSpecification(
                jsonMapper,
                "audit_report_get",
                "Get Audit Report",
                "Read an owned SEOGEO audit report or current run status.",
                """
                        {
                          "type": "object",
                          "properties": {
                            "jobId": {
                              "type": "string"
                            }
                          },
                          "required": ["jobId"],
                          "additionalProperties": false
                        }
                        """,
                objectOutputSchema(),
                toolHandlerService::auditReportGet
        );
    }

    private McpServerFeatures.SyncToolSpecification toolSpecification(
            McpJsonMapper jsonMapper,
            String name,
            String title,
            String description,
            String inputSchema,
            String outputSchema,
            java.util.function.BiFunction<io.modelcontextprotocol.server.McpSyncServerExchange, McpSchema.CallToolRequest, McpSchema.CallToolResult> callHandler
    ) {
        return McpServerFeatures.SyncToolSpecification.builder()
                .tool(McpSchema.Tool.builder()
                        .name(name)
                        .title(title)
                        .description(description)
                        .inputSchema(jsonMapper, inputSchema)
                        .outputSchema(jsonMapper, outputSchema)
                        .build())
                .callHandler(callHandler)
                .build();
    }

    private String objectOutputSchema() {
        return """
                {
                  "type": "object"
                }
                """;
    }

    private McpTransportContext extractTransportContext(HttpServletRequest request) {
        return McpTransportContext.create(Map.of(
                McpAuthenticationContext.AUTHENTICATION_CONTEXT_KEY,
                request.getUserPrincipal()
        ));
    }
}
