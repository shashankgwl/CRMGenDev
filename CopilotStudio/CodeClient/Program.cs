using CodeClient;
using Microsoft.Agents.CopilotStudio.Client;

HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

SampleConnectionSettings settings = new(builder.Configuration.GetSection("CopilotStudioClientSettings"));

builder.Services.AddHttpClient("mcs", client =>
    {
        client.Timeout = TimeSpan.FromMinutes(10);
    })
    .ConfigurePrimaryHttpMessageHandler(() => new AddTokenHandler(settings));

builder.Services
    .AddSingleton(settings)
    .AddTransient(serviceProvider =>
    {
        ILogger<CopilotClient> logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger<CopilotClient>();
        return new CopilotClient(settings, serviceProvider.GetRequiredService<IHttpClientFactory>(), logger, "mcs");
    })
    .AddHostedService<ChatConsoleService>();

IHost host = builder.Build();
host.Run();