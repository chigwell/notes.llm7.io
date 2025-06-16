import React from "react";
import { App as Framework7App, View, Page, Navbar } from "framework7-react";
import { ChatEditorPage } from "./ChatEditorPage";

const App = () => {
  return (
    <Framework7App themeDark={false} theme="ios">
      <View main>
        <Page>
          <Navbar title="Chat & Markdown Editor" />
          <ChatEditorPage />
        </Page>
      </View>
    </Framework7App>
  );
};

export default App;
