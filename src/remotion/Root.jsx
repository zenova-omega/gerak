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
    </>
  );
};
