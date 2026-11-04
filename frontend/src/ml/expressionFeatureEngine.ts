import { ExpressionVector } from '../types/expression';

export class ExpressionFeatureEngine {
  /**
   * Computes the ARKit-inspired ExpressionVector using a hybrid approach.
   * Prioritizes MediaPipe native blend shapes if available, otherwise falls back
   * to calculating from 3D landmark geometry.
   * 
   * @param landmarks 478 3D landmarks from MediaPipe
   * @param blendShapes Native MediaPipe blend shapes map
   * @param transformationMatrix 4x4 face transformation matrix
   * @returns ExpressionVector with 21 coefficients
   */
  compute(
    landmarks: Array<{x: number, y: number, z: number}>,
    blendShapes: Map<string, number> | null,
    transformationMatrix: number[] | null
  ): ExpressionVector {
    const vector = ExpressionFeatureEngine.createZeroVector();

    const hasBlendShapes = blendShapes !== null && blendShapes.size > 0;
    const hasLandmarks = landmarks && landmarks.length >= 468;

    if (!hasBlendShapes && !hasLandmarks) {
      return vector;
    }

    // 1. Compute Base Geometry Metrics for normalization (safely)
    const ipd = hasLandmarks
      ? Math.max(0.001, landmarks.length >= 474
          ? this.computeDistance(landmarks[468], landmarks[473])
          : this.computeDistance(landmarks[33], landmarks[263]))
      : 0.1;
    const faceHeight = hasLandmarks
      ? Math.max(0.001, this.computeDistance(landmarks[1], landmarks[152]))
      : 0.2; 

    // 2. Head Pose (from transformation matrix)
    if (transformationMatrix && transformationMatrix.length === 16) {
      // MediaPipe transformation matrix is column-major 4x4
      const r11 = transformationMatrix[0];
      const r21 = transformationMatrix[1];
      const r31 = transformationMatrix[2];
      const r32 = transformationMatrix[6];
      const r33 = transformationMatrix[10];

      // Pitch (X-axis rotation)
      const pitch = Math.atan2(-r32, r33);
      // Yaw (Y-axis rotation)
      const yaw = Math.asin(r31);
      // Roll (Z-axis rotation)
      const roll = Math.atan2(-r21, r11);

      // Normalize approximately to -1 to 1 (assuming max rotation ~ pi/2)
      vector.headPitch = this.clamp(pitch / (Math.PI / 2), -1, 1);
      vector.headYaw = this.clamp(yaw / (Math.PI / 2), -1, 1);
      vector.headRoll = this.clamp(roll / (Math.PI / 2), -1, 1);
    }

    // 3. Process Blend Shapes (Hybrid Approach)
    const getValue = (key: string, fallback: () => number): number => {
      if (hasBlendShapes && blendShapes.has(key)) {
        return this.clamp(blendShapes.get(key)!, 0, 1);
      }
      return this.clamp(fallback(), 0, 1);
    };

    // Eyes
    vector.eyeBlinkLeft = getValue('eyeBlinkLeft', () => {
      const dist = this.computeDistance(landmarks[159], landmarks[145]);
      return 1.0 - (dist / ipd) * 3.5; 
    });
    vector.eyeBlinkRight = getValue('eyeBlinkRight', () => {
      const dist = this.computeDistance(landmarks[386], landmarks[374]);
      return 1.0 - (dist / ipd) * 3.5;
    });

    vector.eyeWideLeft = getValue('eyeWideLeft', () => {
      const dist = this.computeDistance(landmarks[159], landmarks[145]);
      return (dist / ipd) * 3.0 - 0.8;
    });
    vector.eyeWideRight = getValue('eyeWideRight', () => {
      const dist = this.computeDistance(landmarks[386], landmarks[374]);
      return (dist / ipd) * 3.0 - 0.8;
    });

    vector.eyeSquintLeft = getValue('eyeSquintLeft', () => {
      // Cheek raise pushing lower eyelid up (approx via distance from lower eye to cheek)
      const cheekDist = this.computeDistance(landmarks[145], landmarks[205]);
      return 1.0 - (cheekDist / ipd) * 2.0;
    });
    vector.eyeSquintRight = getValue('eyeSquintRight', () => {
      const cheekDist = this.computeDistance(landmarks[374], landmarks[425]);
      return 1.0 - (cheekDist / ipd) * 2.0;
    });

    // Brows
    // 70, 63, 105, 66, 107 (Left brow)
    // 300, 293, 334, 296, 336 (Right brow)
    vector.browDownLeft = getValue('browDownLeft', () => {
      const dist = this.computeDistance(landmarks[105], landmarks[159]);
      return 1.0 - (dist / ipd) * 2.0;
    });
    vector.browDownRight = getValue('browDownRight', () => {
      const dist = this.computeDistance(landmarks[334], landmarks[386]);
      return 1.0 - (dist / ipd) * 2.0;
    });
    vector.browInnerUp = getValue('browInnerUp', () => {
      const dist = this.computeDistance(landmarks[107], landmarks[336]); 
      return (dist / ipd) * 1.5;
    });
    vector.browOuterUpLeft = getValue('browOuterUpLeft', () => {
      const dist = this.computeDistance(landmarks[70], landmarks[159]);
      return (dist / ipd) * 2.5 - 1.0;
    });
    vector.browOuterUpRight = getValue('browOuterUpRight', () => {
      const dist = this.computeDistance(landmarks[300], landmarks[386]);
      return (dist / ipd) * 2.5 - 1.0;
    });

    // Mouth
    vector.mouthSmileLeft = getValue('mouthSmileLeft', () => {
      const dist = this.computeDistance(landmarks[61], landmarks[13]);
      return (dist / ipd) * 1.5 - 0.5;
    });
    vector.mouthSmileRight = getValue('mouthSmileRight', () => {
      const dist = this.computeDistance(landmarks[291], landmarks[13]);
      return (dist / ipd) * 1.5 - 0.5;
    });

    vector.mouthFrownLeft = getValue('mouthFrownLeft', () => {
      // Angle of mouth corners below horizontal midline
      // Y is down, so if corner Y > lip center Y, it's a frown
      const dy = landmarks[61].y - landmarks[14].y;
      return dy > 0 ? (dy / faceHeight) * 15.0 : 0;
    });
    vector.mouthFrownRight = getValue('mouthFrownRight', () => {
      const dy = landmarks[291].y - landmarks[14].y;
      return dy > 0 ? (dy / faceHeight) * 15.0 : 0;
    });

    vector.mouthOpen = getValue('jawOpen', () => {
      // Distance between upper lip (13) and lower lip (14), normalized by face height
      const dist = this.computeDistance(landmarks[13], landmarks[14]);
      return (dist / faceHeight) * 5.0; 
    });
    // Jaw Open correlates closely with mouth open in our simple ARKit approximation
    vector.jawOpen = vector.mouthOpen;

    vector.mouthPucker = getValue('mouthPucker', () => {
      // Distance between left corner (61) and right corner (291)
      const dist = this.computeDistance(landmarks[61], landmarks[291]);
      return 1.0 - (dist / ipd) * 1.2;
    });

    return vector;
  }

  /**
   * Helper to compute Euclidean distance between two 3D landmarks.
   */
  private computeDistance(p1: {x: number, y: number, z: number}, p2: {x: number, y: number, z: number}): number {
    if (!p1 || !p2) return 0;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Helper to clamp a value between min and max.
   */
  private clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Creates an ExpressionVector with all coefficients set to 0.
   * @returns A zero-initialized ExpressionVector
   */
  static createZeroVector(): ExpressionVector {
    return {
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0,
      eyeWideLeft: 0,
      eyeWideRight: 0,
      eyeSquintLeft: 0,
      eyeSquintRight: 0,
      browDownLeft: 0,
      browDownRight: 0,
      browInnerUp: 0,
      browOuterUpLeft: 0,
      browOuterUpRight: 0,
      mouthSmileLeft: 0,
      mouthSmileRight: 0,
      mouthFrownLeft: 0,
      mouthFrownRight: 0,
      jawOpen: 0,
      mouthPucker: 0,
      mouthOpen: 0,
      headPitch: 0,
      headYaw: 0,
      headRoll: 0,
    };
  }
}
