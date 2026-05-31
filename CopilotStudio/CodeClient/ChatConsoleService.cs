using System.Text.Json;
using Microsoft.Agents.Core.Models;
using Microsoft.Agents.CopilotStudio.Client;

namespace CodeClient;

internal sealed class ChatConsoleService(CopilotClient copilotClient, IHostApplicationLifetime lifetime) : IHostedService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        List<SubmitAction> pendingSubmitActions = [];

        Console.WriteLine("Copilot Studio console client");
        Console.WriteLine("Type your prompt and press Enter. Type /exit to quit.");

        Console.Write("\nagent> ");

        await foreach (Activity activity in copilotClient.StartConversationAsync(
            emitStartConversationEvent: true,
            cancellationToken: cancellationToken))
        {
            PrintActivity(activity, pendingSubmitActions);
        }

        while (!cancellationToken.IsCancellationRequested)
        {
            Console.Write("\nuser> ");
            string? question = Console.ReadLine();

            if (question is null || question.Equals("/exit", StringComparison.OrdinalIgnoreCase))
            {
                lifetime.StopApplication();
                return;
            }

            if (string.IsNullOrWhiteSpace(question))
            {
                continue;
            }

            Console.Write("\nagent> ");
            bool printedAgentContent = false;

            if (TryResolveSubmitAction(question, pendingSubmitActions, out SubmitAction? submitAction))
            {
                SubmitAction selectedAction = submitAction!;
                Activity submitActivity = new()
                {
                    Type = "message",
                    Text = selectedAction.Title,
                    Value = JsonSerializer.Deserialize<object>(selectedAction.DataJson)
                };

                pendingSubmitActions.Clear();

                await foreach (Activity activity in copilotClient.SendActivityAsync(submitActivity, cancellationToken))
                {
                    printedAgentContent |= PrintActivity(activity, pendingSubmitActions);
                }
            }
            else
            {
                pendingSubmitActions.Clear();

                await foreach (Activity activity in copilotClient.AskQuestionAsync(question, null, cancellationToken))
                {
                    printedAgentContent |= PrintActivity(activity, pendingSubmitActions);
                }
            }

            if (!printedAgentContent)
            {
                Console.WriteLine("\n[no message content returned by the agent for this turn]");
            }
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static bool PrintActivity(IActivity activity, List<SubmitAction> pendingSubmitActions)
    {
        switch (activity.Type)
        {
            case "message":
                bool printedContent = PrintMessageContent(activity, pendingSubmitActions);

                if (!printedContent)
                {
                    Console.WriteLine("[message received without text content]");
                    Console.WriteLine(SerializePayload(activity));
                }

                if (activity.SuggestedActions?.Actions.Count > 0)
                {
                    Console.WriteLine("Suggested actions:");
                    foreach (CardAction action in activity.SuggestedActions.Actions)
                    {
                        Console.WriteLine($"  - {action.Text}");
                    }
                }

                return printedContent;

            case "typing":
                Console.Write(".");
                return false;

            case "event":
                Console.Write("+");
                return false;

            default:
                Console.Write($"[{activity.Type}]");
                return false;
        }
    }

    private static bool PrintMessageContent(IActivity activity, List<SubmitAction> pendingSubmitActions)
    {
        bool printedContent = false;

        printedContent |= WriteIfPresent(activity.Text);
        printedContent |= WriteIfPresent(activity.Summary);
        printedContent |= WriteIfPresent(activity.Speak);

        if (activity.Attachments?.Count > 0)
        {
            foreach (Attachment attachment in activity.Attachments)
            {
                printedContent = true;

                if (!string.IsNullOrWhiteSpace(attachment.Name))
                {
                    Console.WriteLine(attachment.Name);
                }

                if (!string.IsNullOrWhiteSpace(attachment.ContentType))
                {
                    Console.WriteLine($"Attachment: {attachment.ContentType}");
                }

                if (!string.IsNullOrWhiteSpace(attachment.ContentUrl))
                {
                    Console.WriteLine(attachment.ContentUrl);
                }

                if (attachment.Content is not null)
                {
                    if (IsAdaptiveCard(attachment.ContentType) && TryPrintAdaptiveCard(attachment.Content, pendingSubmitActions))
                    {
                        continue;
                    }

                    Console.WriteLine(SerializePayload(attachment.Content));
                }
            }
        }

        if (!printedContent && activity.Value is not null)
        {
            Console.WriteLine(SerializePayload(activity.Value));
            printedContent = true;
        }

        if (!printedContent && activity.ChannelData is not null)
        {
            Console.WriteLine(SerializePayload(activity.ChannelData));
            printedContent = true;
        }

        return printedContent;
    }

    private static bool WriteIfPresent(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        Console.WriteLine(value);
        return true;
    }

    private static bool IsAdaptiveCard(string? contentType) =>
        string.Equals(contentType, "application/vnd.microsoft.card.adaptive", StringComparison.OrdinalIgnoreCase);

    private static bool TryPrintAdaptiveCard(object content, List<SubmitAction> pendingSubmitActions)
    {
        using JsonDocument document = JsonDocument.Parse(SerializePayload(content));
        JsonElement root = document.RootElement;

        List<string> textBlocks = [];
        List<SubmitAction> submitActions = [];

        ExtractAdaptiveCardContent(root, textBlocks, submitActions);

        foreach (string text in textBlocks.Where(text => !string.IsNullOrWhiteSpace(text)).Distinct())
        {
            Console.WriteLine(text);
        }

        if (submitActions.Count > 0)
        {
            pendingSubmitActions.Clear();
            pendingSubmitActions.AddRange(submitActions);

            Console.WriteLine("Actions:");
            for (int index = 0; index < pendingSubmitActions.Count; index++)
            {
                Console.WriteLine($"  {index + 1}. {pendingSubmitActions[index].Title}");
            }

            Console.WriteLine("Type an action number or title to continue.");
        }

        return textBlocks.Count > 0 || submitActions.Count > 0;
    }

    private static void ExtractAdaptiveCardContent(JsonElement element, List<string> textBlocks, List<SubmitAction> submitActions)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            if (element.TryGetProperty("type", out JsonElement typeElement))
            {
                string? type = typeElement.GetString();

                if (string.Equals(type, "TextBlock", StringComparison.OrdinalIgnoreCase)
                    && element.TryGetProperty("text", out JsonElement textElement))
                {
                    textBlocks.Add(textElement.GetString() ?? string.Empty);
                }
                else if (string.Equals(type, "Action.Submit", StringComparison.OrdinalIgnoreCase))
                {
                    string title = element.TryGetProperty("title", out JsonElement titleElement)
                        ? titleElement.GetString() ?? "Submit"
                        : "Submit";

                    string dataJson = element.TryGetProperty("data", out JsonElement dataElement)
                        ? dataElement.GetRawText()
                        : "{}";

                    submitActions.Add(new SubmitAction(title, dataJson));
                }
            }

            foreach (JsonProperty property in element.EnumerateObject())
            {
                ExtractAdaptiveCardContent(property.Value, textBlocks, submitActions);
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (JsonElement item in element.EnumerateArray())
            {
                ExtractAdaptiveCardContent(item, textBlocks, submitActions);
            }
        }
    }

    private static bool TryResolveSubmitAction(string input, IReadOnlyList<SubmitAction> pendingSubmitActions, out SubmitAction? submitAction)
    {
        submitAction = null;

        if (pendingSubmitActions.Count == 0)
        {
            return false;
        }

        if (int.TryParse(input, out int actionNumber)
            && actionNumber >= 1
            && actionNumber <= pendingSubmitActions.Count)
        {
            submitAction = pendingSubmitActions[actionNumber - 1];
            return true;
        }

        submitAction = pendingSubmitActions.FirstOrDefault(action =>
            string.Equals(action.Title, input, StringComparison.OrdinalIgnoreCase));

        return submitAction is not null;
    }

    private static string SerializePayload(object payload)
    {
        try
        {
            return JsonSerializer.Serialize(payload, JsonOptions);
        }
        catch (NotSupportedException)
        {
            return payload.ToString() ?? string.Empty;
        }
    }

    private sealed record SubmitAction(string Title, string DataJson);
}