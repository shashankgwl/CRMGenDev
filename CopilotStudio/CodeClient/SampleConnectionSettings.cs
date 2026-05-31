using Microsoft.Agents.CopilotStudio.Client;

namespace CodeClient;

internal sealed class SampleConnectionSettings : ConnectionSettings
{
    public SampleConnectionSettings(IConfigurationSection config)
        : base(config)
    {
        TenantId = GetRequiredSetting(config, nameof(TenantId));
        AppClientId = GetRequiredSetting(config, nameof(AppClientId));
    }

    public string TenantId { get; }

    public string AppClientId { get; }

    private static string GetRequiredSetting(IConfigurationSection config, string settingName)
    {
        string? value = config[settingName];

        if (string.IsNullOrWhiteSpace(value) || value.StartsWith("<", StringComparison.Ordinal))
        {
            throw new ArgumentException(
                $"CopilotStudioClientSettings:{settingName} must be set in appsettings.json before running the client.");
        }

        return value;
    }
}