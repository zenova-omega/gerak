import { Composition } from 'remotion';
import { SplashIntro } from './scenes/SplashIntro';
import { ViralCascade } from './scenes/ViralCascade';
import { IndonesiaNetwork } from './scenes/IndonesiaNetwork';
import { IntroVideo } from './scenes/IntroVideo';
import { MissionTypes } from './scenes/MissionTypes';
import { GamifikasiReward } from './scenes/GamifikasiReward';
import { OperationalFlow } from './scenes/OperationalFlow';
import { Demographics } from './scenes/Demographics';
import { ClosingQuote } from './scenes/ClosingQuote';
import { BeforeAfter } from './scenes/BeforeAfter';
import { WhySinar } from './scenes/WhySinar';
import { SplashIntroV2 } from './scenes/SplashIntroV2';
import { TitleSlideV2 } from './scenes/TitleSlideV2';
import { ApaItuSinarV2 } from './scenes/ApaItuSinarV2';
import { ViralCascadeV2 } from './scenes/ViralCascadeV2';
import { IndonesiaNetworkV2 } from './scenes/IndonesiaNetworkV2';
import { PlatformMisiV2 } from './scenes/PlatformMisiV2';
import { TechPlatformV2 } from './scenes/TechPlatformV2';
import { MissionTypesV2 } from './scenes/MissionTypesV2';
import { GamifikasiRewardV2 } from './scenes/GamifikasiRewardV2';
import { TokoPoinV2 } from './scenes/TokoPoinV2';
import { PaketLayananV2 } from './scenes/PaketLayananV2';
import { OperationalFlowV2 } from './scenes/OperationalFlowV2';
import { WhySinarV2 } from './scenes/WhySinarV2';
import { BeforeAfterV2 } from './scenes/BeforeAfterV2';
import { ClosingQuoteV2 } from './scenes/ClosingQuoteV2';
import { DemographicsV2 } from './scenes/DemographicsV2';

const FPS = 30;

export const RemotionRoot = () => {
  return (
    <>
      {/* Cinematic splash intro — 12 seconds */}
      <Composition
        id="SplashIntro"
        component={SplashIntro}
        durationInFrames={12 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Viral cascade animation — 20 seconds (builds up then holds) */}
      <Composition
        id="ViralCascade"
        component={ViralCascade}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Indonesia network map activation — 20 seconds (builds up then holds) */}
      <Composition
        id="IndonesiaNetwork"
        component={IndonesiaNetwork}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Mission types — 20 seconds */}
      <Composition
        id="MissionTypes"
        component={MissionTypes}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Gamification + Reward shop — 20 seconds */}
      <Composition
        id="GamifikasiReward"
        component={GamifikasiReward}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Operational flow — 20 seconds */}
      <Composition
        id="OperationalFlow"
        component={OperationalFlow}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Why SINAR works — 20 seconds */}
      <Composition
        id="WhySinar"
        component={WhySinar}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Before/After comparison — 20 seconds */}
      <Composition
        id="BeforeAfter"
        component={BeforeAfter}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Closing quote — 20 seconds */}
      <Composition
        id="ClosingQuote"
        component={ClosingQuote}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Demographics — 20 seconds */}
      <Composition
        id="Demographics"
        component={Demographics}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* 15-second intro/promo video — Script A */}
      <Composition
        id="IntroVideo"
        component={IntroVideo}
        durationInFrames={450}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* ── V2: Title Slide ── */}
      <Composition
        id="TitleSlideV2"
        component={TitleSlideV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* ── V2: Apa Itu SINAR ── */}
      <Composition
        id="ApaItuSinarV2"
        component={ApaItuSinarV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* ── V2 Samples: Opsi C (Green & Steel) ── */}
      <Composition
        id="SplashIntroV2"
        component={SplashIntroV2}
        durationInFrames={12 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ViralCascadeV2"
        component={ViralCascadeV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="IndonesiaNetworkV2"
        component={IndonesiaNetworkV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="PlatformMisiV2"
        component={PlatformMisiV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="MissionTypesV2"
        component={MissionTypesV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="GamifikasiRewardV2"
        component={GamifikasiRewardV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="TechPlatformV2"
        component={TechPlatformV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="TokoPoinV2"
        component={TokoPoinV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="PaketLayananV2"
        component={PaketLayananV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="OperationalFlowV2"
        component={OperationalFlowV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="WhySinarV2"
        component={WhySinarV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="BeforeAfterV2"
        component={BeforeAfterV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ClosingQuoteV2"
        component={ClosingQuoteV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="DemographicsV2"
        component={DemographicsV2}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
