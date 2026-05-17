import React from "react";
import styled from "styled-components";
import AsciiFeed from "./AsciiFeed";

const FEEDS = [
  { id: "YDvsBbKfLPA", title: "Bloomberg" },
  { id: "gCNeDWCI0vo", title: "Al Jazeera" },
  { id: "BOy2xDU1LC8", title: "CGTN" }
];

const Page = styled.div`
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
`;

const FeedSlot = styled.div`
  position: relative;
  flex: 1;
  background: #000;
  overflow: hidden;
`;

function App() {
  return (
    <Page>
      {FEEDS.map((feed) => (
        <FeedSlot key={feed.id}>
          <AsciiFeed streamUrl={`/api/hls/${feed.id}/playlist.m3u8`} />
        </FeedSlot>
      ))}
    </Page>
  );
}

export default App;
