using System.Net.Http.Headers;
using System.Runtime.InteropServices;
using Microsoft.Agents.CopilotStudio.Client;
using Microsoft.Identity.Client;
using Microsoft.Identity.Client.Extensions.Msal;

namespace CodeClient;

internal sealed class AddTokenHandler(SampleConnectionSettings settings) : DelegatingHandler(new HttpClientHandler())
{
    private const string KeyChainServiceName = "codeclient_copilot_studio";
    private const string KeyChainAccountName = "codeclient_user_token_cache";

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.Headers.Authorization is null)
        {
            AuthenticationResult authResponse = await AuthenticateAsync(cancellationToken);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authResponse.AccessToken);
        }

        return await base.SendAsync(request, cancellationToken);
    }

    private async Task<AuthenticationResult> AuthenticateAsync(CancellationToken cancellationToken)
    {
        string[] scopes = [CopilotClient.ScopeFromSettings(settings)];

        IPublicClientApplication app = PublicClientApplicationBuilder.Create(settings.AppClientId)
            .WithAuthority(AadAuthorityAudience.AzureAdMyOrg)
            .WithTenantId(settings.TenantId)
            .WithRedirectUri("http://localhost")
            .Build();

        await RegisterTokenCacheAsync(app);

        IAccount? account = (await app.GetAccountsAsync()).FirstOrDefault();

        try
        {
            return await app.AcquireTokenSilent(scopes, account).ExecuteAsync(cancellationToken);
        }
        catch (MsalUiRequiredException)
        {
            try
            {
                return await app.AcquireTokenInteractive(scopes).ExecuteAsync(cancellationToken);
            }
            catch (MsalServiceException ex) when (ex.ErrorCode == "invalid_client" && ex.Message.Contains("AADSTS7000218", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Authentication failed because the Entra app registration is configured like a confidential/web client. " +
                    "For this console app, add a Mobile and desktop applications platform with redirect URI 'http://localhost', " +
                    "or enable public client/native flows, then rerun the app.",
                    ex);
            }
        }
    }

    private static async Task RegisterTokenCacheAsync(IPublicClientApplication app)
    {
        string cacheDirectory = Path.Combine(AppContext.BaseDirectory, "mcs_client_console");
        Directory.CreateDirectory(cacheDirectory);

        StorageCreationPropertiesBuilder storageProperties = new("TokenCache", cacheDirectory);

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            storageProperties.WithLinuxUnprotectedFile();
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            storageProperties.WithMacKeyChain(KeyChainServiceName, KeyChainAccountName);
        }

        MsalCacheHelper tokenCacheHelper = await MsalCacheHelper.CreateAsync(storageProperties.Build());
        tokenCacheHelper.RegisterCache(app.UserTokenCache);
    }
}