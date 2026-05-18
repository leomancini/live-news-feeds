import React, { useEffect, useState } from "react";
import styled from "styled-components";
import AsciiFeed from "./AsciiFeed";

const FEEDS = [
  { id: "YDvsBbKfLPA", slug: "sky-news", title: "Sky News" },
  { id: "gCNeDWCI0vo", slug: "al-jazeera", title: "Al Jazeera" },
  { id: "BOy2xDU1LC8", slug: "cgtn", title: "CGTN" }
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

function getSlugFromPath() {
  const segment = window.location.pathname.split("/").filter(Boolean)[0];
  return segment ? segment.toLowerCase() : null;
}

function App() {
  const [slug, setSlug] = useState(getSlugFromPath);

  useEffect(() => {
    const onPop = () => setSlug(getSlugFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const single = slug ? FEEDS.find((f) => f.slug === slug) : null;
  const visible = single ? [single] : FEEDS;

  return (
    <Page>
      {visible.map((feed) => (
        <FeedSlot key={feed.id}>
          <AsciiFeed streamUrl={`/api/hls/${feed.id}/playlist.m3u8`} />
        </FeedSlot>
      ))}
    </Page>
  );
}

export default App;
