/**
 * The `.home3d-model` subtree -- every stage's `*-detail` markup, faces,
 * roof, chimney, balcony. Shared by `RotatableHome` (the interactive hero)
 * and `StageMini` (the decorative preview, T14) so a CSS/markup fix for one
 * stage (e.g. T1's tent-flap tuning) can never land in one copy and diverge
 * in the other -- there is only one copy.
 */
export function HomeModel({ stageClassName }: { stageClassName: string }) {
  return (
    <div className={`home3d-model ${stageClassName}`}>
      <div className="building-face face-front">
        <div className="window3d window-left">
          <i />
        </div>
        <div className="door3d">
          <i />
        </div>
        <div className="window3d window-right">
          <i />
        </div>
        <div className="upper-windows">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="building-face face-back" />
      <div className="building-face face-left">
        <span className="side-window" />
      </div>
      <div className="building-face face-right">
        <span className="side-window" />
      </div>
      <div className="building-face face-top" />
      <div className="roof3d">
        <span className="roof-front" />
        <span className="roof-back" />
      </div>
      <div className="chimney3d">
        <i />
        <b />
      </div>
      <div className="balcony3d">
        <span />
        <i />
      </div>
      <div className="tent-detail">
        <span className="tent-gable tent-gable-front" />
        <span className="tent-gable tent-gable-back" />
        <span className="tent-slope tent-slope-left" />
        <span className="tent-slope tent-slope-right" />
        <i className="tent-flap" />
      </div>
      <div className="trailer-detail">
        <span className="trailer-stripe trailer-stripe-near" />
        <span className="trailer-stripe trailer-stripe-far" />
        <span className="trailer-hitch" />
        <i className="wheel wheel-near-left" />
        <i className="wheel wheel-near-right" />
        <i className="wheel wheel-far-left" />
        <i className="wheel wheel-far-right" />
      </div>
      <div className="cabin-detail">
        <span className="cabin-gable cabin-gable-front" />
        <span className="cabin-gable cabin-gable-back" />
        <span className="cabin-roof-plane cabin-roof-left" />
        <span className="cabin-roof-plane cabin-roof-right" />
      </div>
      <div className="apartment-detail">
        <span />
        <span />
        <span />
      </div>
      <div className="house-detail">
        <span className="garage" />
        <span className="porch" />
      </div>
      <div className="mansion-detail">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
