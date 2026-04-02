package com.nabin.seogeo.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
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
        mcpObjectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return new JacksonMcpJsonMapper(mcpObjectMapper);
    }

    @Bean
    JsonSchemaValidator mcpJsonSchemaValidator(ObjectMapper objectMapper) {
        ObjectMapper validatorObjectMapper = objectMapper.copy();
        validatorObjectMapper.registerModule(new JavaTimeModule());
        validatorObjectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
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
            McpMetadataCatalog mcpMetadataCatalog,
            @Value("${spring.application.version:0.0.1-SNAPSHOT}") String applicationVersion
    ) {
        return McpServer.sync(transportProvider)
                .jsonMapper(mcpJsonMapper)
                .jsonSchemaValidator(mcpJsonSchemaValidator)
                .serverInfo("seogeo", applicationVersion)
                .instructions(mcpMetadataCatalog.serverInstructions())
                .capabilities(McpSchema.ServerCapabilities.builder()
                        .resources(false, false)
                        .tools(false)
                        .build())
                .resources(overviewResourceSpecification(mcpMetadataCatalog))
                .tools(
                        projectsListSpecification(mcpJsonMapper, mcpToolHandlerService, mcpMetadataCatalog),
                        projectGetSpecification(mcpJsonMapper, mcpToolHandlerService, mcpMetadataCatalog),
                        projectAuditsListSpecification(mcpJsonMapper, mcpToolHandlerService, mcpMetadataCatalog),
                        auditStartSpecification(mcpJsonMapper, mcpToolHandlerService, mcpMetadataCatalog),
                        auditReportGetSpecification(mcpJsonMapper, mcpToolHandlerService, mcpMetadataCatalog)
                )
                .build();
    }

    private McpServerFeatures.SyncResourceSpecification overviewResourceSpecification(McpMetadataCatalog metadataCatalog) {
        return new McpServerFeatures.SyncResourceSpecification(
                metadataCatalog.overviewResource(),
                (exchange, request) -> metadataCatalog.readOverviewResource()
        );
    }

    private McpServerFeatures.SyncToolSpecification projectsListSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService,
            McpMetadataCatalog metadataCatalog
    ) {
        return McpServerFeatures.SyncToolSpecification.builder()
                .tool(McpSchema.Tool.builder()
                        .name("projects_list")
                        .title("List Projects")
                        .description("Start here to discover projects and slugs visible to the authenticated SEOGEO account.")
                        .inputSchema(jsonMapper, metadataCatalog.projectsListInputSchema())
                        .outputSchema(jsonMapper, metadataCatalog.projectsListOutputSchema())
                        .build())
                .callHandler(toolHandlerService::projectsList)
                .build();
    }

    private McpServerFeatures.SyncToolSpecification projectGetSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService,
            McpMetadataCatalog metadataCatalog
    ) {
        return toolSpecification(
                jsonMapper,
                "project_get",
                "Get Project",
                "Read one project summary using a slug returned by projects_list.",
                metadataCatalog.projectGetInputSchema(),
                metadataCatalog.projectSummaryOutputSchema(),
                toolHandlerService::projectGet
        );
    }

    private McpServerFeatures.SyncToolSpecification projectAuditsListSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService,
            McpMetadataCatalog metadataCatalog
    ) {
        return toolSpecification(
                jsonMapper,
                "project_audits_list",
                "List Project Audits",
                "List audit history for one project slug returned by projects_list, optionally filtered to one tracked URL bucket.",
                metadataCatalog.projectAuditsListInputSchema(),
                metadataCatalog.projectAuditsListOutputSchema(),
                toolHandlerService::projectAuditsList
        );
    }

    private McpServerFeatures.SyncToolSpecification auditStartSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService,
            McpMetadataCatalog metadataCatalog
    ) {
        return toolSpecification(
                jsonMapper,
                "audit_start",
                "Start Audit",
                "Start an audit for a website and return the jobId used by audit_report_get.",
                metadataCatalog.auditStartInputSchema(),
                metadataCatalog.auditStartOutputSchema(),
                toolHandlerService::auditStart
        );
    }

    private McpServerFeatures.SyncToolSpecification auditReportGetSpecification(
            McpJsonMapper jsonMapper,
            McpToolHandlerService toolHandlerService,
            McpMetadataCatalog metadataCatalog
    ) {
        return toolSpecification(
                jsonMapper,
                "audit_report_get",
                "Get Audit Report",
                "Poll an audit job until status is VERIFIED or FAILED. The jobId comes from audit_start or project_audits_list.",
                metadataCatalog.auditReportGetInputSchema(),
                metadataCatalog.auditReportGetOutputSchema(),
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

    private McpTransportContext extractTransportContext(HttpServletRequest request) {
        return McpTransportContext.create(Map.of(
                McpAuthenticationContext.AUTHENTICATION_CONTEXT_KEY,
                request.getUserPrincipal()
        ));
    }
}
