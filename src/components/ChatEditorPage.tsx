import React, { useState, useEffect, useRef } from "react";
import {
  f7,
  Block,
  Button,
  Fab,
  FabButton,
  FabButtons,
  Link,
  List,
  ListInput,
  Message,
  Messagebar,
  Messages,
  Navbar,
  NavRight,
  Page,
  Popup,
  Preloader,
} from "framework7-react";
import { ChatLLM7 } from "langchain-llm7";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import MDEditor from "@uiw/react-md-editor";
import mammoth from "mammoth";
import { marked } from "marked";
import TurndownService from "turndown";
import { saveAs } from "file-saver";
import { llmatch } from "llmatch-js";

/* ---------------------------------------------------------------------- */
/*  Chat model                                                            */
/* ---------------------------------------------------------------------- */

const chatModel = new ChatLLM7({});
const SYSTEM_PROMPT =
  "You are a helpful assistant that provides concise, high-quality answers.";

/* ---------------------------------------------------------------------- */
/*  Types                                                                 */
/* ---------------------------------------------------------------------- */

type Role = "user" | "assistant";
type ChatMessage = { role: Role; content: string };

/* ---------------------------------------------------------------------- */
/*  Left pane – chat UI                                                   */
/* ---------------------------------------------------------------------- */

interface ChatPaneProps {
  messages: ChatMessage[];
  userInput: string;
  setUserInput: (v: string) => void;
  sendMessage: () => void;
  isSending: boolean;
}

const ChatPane: React.FC<ChatPaneProps> = ({
  messages,
  userInput,
  setUserInput,
  sendMessage,
  isSending,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* scroll to bottom when messages change */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* convert our role → Framework7 "type" */
  const mapType = (role: Role) => (role === "user" ? "sent" : "received");

  return (
    <div
      style={{
        flexBasis: "33.333%",
        borderRight: "1px solid #ddd",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        minWidth: "250px",
      }}
    >
      {/* message list */}
      <div
        style={{
          flex: "1 1 auto",
          overflowY: "auto",
          padding: "0 4px 52px",
        }}
      >
        <Messages>
          {messages.map((m, idx) => (
            <Message key={idx} type={mapType(m.role)} text={m.content} />
          ))}
        </Messages>
        <div ref={bottomRef} />
      </div>

      {/* input bar */}
      <Messagebar
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        value={userInput}
        onInput={(e) => setUserInput((e.target as HTMLInputElement).value)}
        disabled={isSending}
      >
        {isSending ? (
          <div
            slot="inner-end"
            style={{
              width: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Preloader color="multi" />
          </div>
        ) : (
          <Link
            slot="inner-end"
            iconIos="f7:arrow_up_circle_fill"
            iconMd="material:send"
            onClick={sendMessage}
          />
        )}
      </Messagebar>
    </div>
  );
};

/* ---------------------------------------------------------------------- */
/*  Helper – template generation via llmatch                              */
/* ---------------------------------------------------------------------- */

const generateMarkdownTemplate = async (): Promise<string | null> => {
  f7.preloader.show();
  try {

    const chat = new ChatLLM7();

    const llm = {
      invoke: async (messages: any, options: any = {}) => {
        const resp = await chat.invoke(messages, options); // ✅ fixed
        return { content: resp.content, raw: resp };
      },
    };

    const result = await llmatch({
      llm,
      query:
        "Generate a markdown template for a technical document including title, introduction, multiple sections with headings, bullet points, and a conclusion. Return only fenced markdown code block.",
      pattern: /```md\n([\s\S]*?)```/,
      verbose: true,
      maxRetries: 3,
    });

    console.log(result);

    if (result.success) {
      return result.extractedData[0];
    }

    console.error("Template extraction failed:", result.errorMessage);
    return null;
  } catch (err) {
    console.error("Template generation error:", err);
    return null;
  }
    finally {
        f7.preloader.hide();
    }
};


/* ---------------------------------------------------------------------- */
/*  Main component – two-pane layout                                      */
/* ---------------------------------------------------------------------- */

export const ChatEditorPage: React.FC = () => {
  /* ---------------- STATE ---------------- */
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Let's start! Which document do you need?",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [markdownText, setMarkdownText] = useState("");

  // Popup state
  const [imagePopupOpened, setImagePopupOpened] = useState(false);
  const [filePopupOpened, setFilePopupOpened] = useState(false);

  // Image‑related state
  const [imageUrl, setImageUrl] = useState("");
  const [imageDesc, setImageDesc] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");

  /* ---------------- EFFECTS ---------------- */

  /* Load markdown from localStorage (or generate template) exactly once */
  useEffect(() => {
    const init = async () => {
      const saved = window.localStorage.getItem("markdownText");
      if (saved && saved.trim() && saved.trim().length > 0) {
        setMarkdownText(saved);
      } else {
        const tpl = await generateMarkdownTemplate();
        if (tpl) {
          setMarkdownText(tpl);
        }
      }
    };
    init().catch(console.error);
  }, []);

  /* Persist markdownText to localStorage whenever it changes */
  useEffect(() => {
    window.localStorage.setItem("markdownText", markdownText);
  }, [markdownText]);

  /* ---------------- CHAT LOGIC ---------------- */
  const sendMessage = async () => {
      if (!userInput.trim()) return;

      const userMsg: ChatMessage = { role: "user", content: userInput };
      setMessages((prev) => [...prev, userMsg]);
      setUserInput("");
      setIsSending(true);

      try {
        const llm = {
          invoke: async (messages: any[]) => {
            const resp = await chatModel.invoke(messages);
            return { content: resp.content };
          },
        };

        // Phase 1: Detect if user input is about editing the document
        const detection = await llmatch({
          llm,
          query: `Is this user message about editing the following markdown document?\n\nMessage:\n"${userInput}"\n\nMarkdown:\n${markdownText}\n\nAnswer with \`0\` if unrelated, \`1\` if editing.`,
          pattern: /[`]?([01])[`]?/,
          maxRetries: 3,
          verbose: false,
        });

        if (!detection.success || detection.extractedData[0] !== "1") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "❗️Please clarify how your message relates to editing the current document.",
            },
          ]);
          return;
        }

        // Phase 2: Extract the actual changes
        const changeExtraction = await llmatch({
          llm,
          query: `Extract the specific changes needed to the markdown document.\n\nMarkdown:\n${markdownText}\n\nUser request:\n${userInput}\n\nReturn as JSON array: [{"what_to_change": "...", "new_value": "..."}]`,
          pattern: /```json\n([\s\S]*?)```/,
          maxRetries: 3,
          verbose: false,
        });
        console.log(changeExtraction);

        if (!changeExtraction.success) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "⚠️ Sorry, I couldn't extract changes. Try rephrasing your request.",
            },
          ]);
          return;
        }

        // Apply changes to markdown
        const raw = changeExtraction.extractedData[0];
        console.log(raw)
        const parsed = JSON.parse(raw);
        const updates: string[] = [];

        let updatedText = markdownText;
        for (const { what_to_change, new_value } of parsed) {
          if (!updatedText.includes(what_to_change)) continue;
          updatedText = updatedText.replace(what_to_change, new_value);
          updates.push(`✅ Replaced "${what_to_change}"`);
        }

        setMarkdownText(updatedText);

        // Friendly summary message
        const changeSummary = updates.length
          ? updates.join("\n")
          : "⚠️ No matching content found in the document to update.";

        setMessages((prev) => [...prev, { role: "assistant", content: changeSummary }]);
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "❌ An error occurred while processing your request." },
        ]);
      } finally {
        setIsSending(false);
      }
    };


  /* ---------------- IMAGE HELPERS ---------------- */
  const describeImage = async () => {
    if (!imageUrl) return;
    f7.preloader.show();
    const res = await chatModel.invoke([
      new SystemMessage("You are an expert image describer."),
      new HumanMessage(`Describe the image at ${imageUrl} in one sentence.`),
    ]);
    setImageDesc(res.content.trim());
    f7.preloader.hide();
  };

  const improveDescription = async () => {
    if (!imageDesc) return;
    f7.preloader.show();
    const res = await chatModel.invoke([
      new SystemMessage("Polish the following description."),
      new HumanMessage(`Improve: "${imageDesc}"`),
    ]);
    setImageDesc(res.content.trim());
    f7.preloader.hide();
  };

  const regenerateImage = () => {
    if (!imageDesc) return;
    f7.preloader.show();
    const prompt = encodeURIComponent(imageDesc);
    setGeneratedImageUrl(`https://image.pollinations.ai/prompt/${prompt}?model=flux&nologo=true`);
    setTimeout(() => {
      f7.preloader.hide();
    }, 2000);
  };

  const insertImageMarkdown = (useGenerated = false) => {
    const url = useGenerated && generatedImageUrl ? generatedImageUrl : imageUrl;
    if (!url || !imageDesc) return;
    const md = `![${imageDesc}](${url})`;
    setMarkdownText((prev) => (prev ? `${prev}\n\n${md}` : md));
  };

  /* ---------------- FILE IMPORT / EXPORT ---------------- */
  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext) return;

    if (ext === "md" || ext === "txt") {
      setMarkdownText(await file.text());
    } else if (ext === "docx") {
      const ab = await file.arrayBuffer();
      const html = (await mammoth.convertToHtml({ arrayBuffer: ab })).value;
      const md = new TurndownService().turndown(html);
      setMarkdownText(md);
    } else {
      // eslint-disable-next-line no-alert
      alert("Unsupported file type");
    }
  };

  const exportDocx = () => {
    const htmlBody = marked.parse(markdownText);
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${htmlBody}</body></html>`;
    const blob = (window as any).htmlDocx.asBlob(fullHtml);
    saveAs(blob, "document.docx");
  };

  const checkImageUrl = (url: string) => {
    try {
      new URL(url);
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  JSX                                                               */
  /* ------------------------------------------------------------------ */
  return (
    <>
      {/* PRIMARY LAYOUT */}
      <div style={{ display: "flex", height: "94vh" }}>
        {/* LEFT 1/3 – CHAT */}
        <ChatPane
          messages={messages}
          userInput={userInput}
          setUserInput={setUserInput}
          sendMessage={sendMessage}
          isSending={isSending}
        />

        {/* RIGHT 2/3 – EDITOR */}
        <div style={{ flex: "1 1 auto", overflowY: "auto" }} data-color-mode="light">
          <MDEditor value={markdownText} onChange={(v) => setMarkdownText(v || "")} height={350} />
        </div>
      </div>

      {/* ---------- FAB ---------- */}
      <Fab position="right-bottom" slot="fixed">
        <i className="icon f7-icons ios">plus</i>
        <i className="icon material-icons md">add</i>
        <i className="icon f7-icons ios">xmark</i>
        <i className="icon material-icons md">close</i>
        <FabButtons position="top">
          <FabButton label="Images" onClick={() => setImagePopupOpened(true)}>
            🖼️
          </FabButton>
          <FabButton label="Import / Export" onClick={() => setFilePopupOpened(true)}>
            📄
          </FabButton>
        </FabButtons>
      </Fab>

      {/* ---------- IMAGE POPUP ---------- */}
      <Popup
        opened={imagePopupOpened}
        onPopupClosed={() => setImagePopupOpened(false)}
      >
        <Page>
          <Navbar title="Image Tools">
            <NavRight>
              <Link popupClose>Close</Link>
            </NavRight>
          </Navbar>
          <Block>
            <List strongIos dividersIos insetIos>
              <ListInput
                label="Image URL"
                type="url"
                placeholder="https://example.com/image.jpg"
                clearButton
                value={imageUrl}
                onInput={(e) => setImageUrl((e.target as HTMLInputElement).value)}
              />
            </List>

            <Button fill onClick={describeImage} className="mt-4" large disabled={!checkImageUrl(imageUrl)}>
              Describe
            </Button>

            {imageDesc && (
              <>
                <Block inset strong className="mt-4">
                  <p>
                    <b>Description:</b> {imageDesc}
                  </p>
                  <Button fill onClick={improveDescription} className="mt-2" large>
                    Improve Description
                  </Button>
                </Block>

                <Button outline onClick={regenerateImage} className="mt-4" large>
                  Re‑generate Image
                </Button>

                {generatedImageUrl && (
                  <img
                    src={generatedImageUrl}
                    alt={imageDesc}
                    className="max-w-[120px] mt-4 rounded"
                  />
                )}

                <div className="flex gap-2 mt-4">
                    <Block strong outlineIos>
                      <Button small fill onClick={() => insertImageMarkdown(false)}>
                        Insert Original
                      </Button>
                    </Block>
                  {generatedImageUrl && (
                    <Block strong outlineIos>
                        <Button small fill onClick={() => insertImageMarkdown(true)}>
                          Insert New
                        </Button>
                    </Block>
                  )}
                </div>
              </>
            )}
          </Block>
        </Page>
      </Popup>

      {/* ---------- FILE POPUP ---------- */}
      <Popup opened={filePopupOpened} onPopupClosed={() => setFilePopupOpened(false)}>
        <Page>
          <Navbar title="Import / Export">
            <NavRight>
              <Link popupClose>Close</Link>
            </NavRight>
          </Navbar>
          <Block>
            <input
              id="fileInput"
              type="file"
              accept=".md,.txt,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />

            <div className="flex gap-4">
              <Block strong outlineIos>
                  <Button
                    fill
                    onClick={() => document.getElementById("fileInput")?.click()}
                  >
                    Open (.md | .txt | .docx)
                  </Button>
                </Block>
                <Block strong outlineIos>
                  <Button fill onClick={exportDocx}>Export → .docx</Button>
                </Block>
            </div>
          </Block>
        </Page>
      </Popup>
    </>
  );
};
