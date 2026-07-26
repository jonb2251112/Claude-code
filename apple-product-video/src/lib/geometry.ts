/**
 * Geometry builders for the procedural product.
 *
 * The shape language is deliberately one idea: a *squircle-ish* rounded square,
 * extruded and chamfered. Everything — chassis, glass, internal core, the light
 * seam — is the same outline at a different scale and depth, which is exactly
 * how real industrial design achieves visual coherence.
 */

import * as THREE from 'three';

/**
 * A rounded square built from four quadratic corners.
 *
 * `smoothing` biases the control points toward a superellipse ("squircle").
 * At 1.0 you get plain circular corners; at ~1.35 you get the continuous-
 * curvature corner Apple uses, where the curve blends into the straight edge
 * with no visible seam. This one number is doing an enormous amount of work.
 */
export const roundedSquareShape = (size: number, radius: number, smoothing = 1.32): THREE.Shape => {
  const h = size / 2;
  const r = Math.min(radius, h);
  const c = r * (1 - 1 / smoothing); // how far the corner "starts" early
  const shape = new THREE.Shape();

  shape.moveTo(-h + r, -h);
  shape.lineTo(h - r, -h);
  shape.bezierCurveTo(h - c, -h, h, -h + c, h, -h + r);
  shape.lineTo(h, h - r);
  shape.bezierCurveTo(h, h - c, h - c, h, h - r, h);
  shape.lineTo(-h + r, h);
  shape.bezierCurveTo(-h + c, h, -h, h - c, -h, h - r);
  shape.lineTo(-h, -h + r);
  shape.bezierCurveTo(-h, -h + c, -h + c, -h, -h + r, -h);
  shape.closePath();

  return shape;
};

/**
 * Extrudes the outline into a slab with a chamfer on both faces, then rotates
 * it flat and re-centres it so the origin is the geometric centre of the part.
 *
 * A chamfer — not a fillet — is the correct edge for machined aluminium: it
 * catches a single crisp specular line, which is the highlight that races
 * around the body during the hero orbit.
 */
export const makeSlabGeometry = (
  size: number,
  cornerRadius: number,
  thickness: number,
  bevel: number,
  curveSegments = 24,
): THREE.ExtrudeGeometry => {
  const shape = roundedSquareShape(size - bevel * 2, cornerRadius - bevel);
  const depth = Math.max(0.001, thickness - bevel * 2);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments,
  });

  // Extrude runs along +Z; lay it flat so +Y is up, then centre it.
  geometry.rotateX(-Math.PI / 2);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
};

/** Flat cap of the same outline — used for the display surface and light seam. */
export const makeFaceGeometry = (
  size: number,
  cornerRadius: number,
  curveSegments = 24,
): THREE.ShapeGeometry => {
  const shape = roundedSquareShape(size, cornerRadius);
  const geometry = new THREE.ShapeGeometry(shape, curveSegments);
  geometry.rotateX(-Math.PI / 2);
  geometry.center();
  return geometry;
};

/**
 * Samples N points on the *silhouette shell* of the product — the outline
 * swept through the body's thickness, plus the top and bottom faces.
 *
 * These are the landing targets for the cold-open particle system: when the
 * particles arrive, the point cloud reads as the product's form before any
 * surface is lit. That's the "resolve into silhouette" beat.
 */
export const sampleProductSurface = (
  size: number,
  cornerRadius: number,
  thickness: number,
  count: number,
  random: (i: number) => number,
): Float32Array => {
  const outline = roundedSquareShape(size, cornerRadius).getSpacedPoints(512);
  const positions = new Float32Array(count * 3);
  const halfT = thickness / 2;

  for (let i = 0; i < count; i++) {
    const r = random(i * 7 + 1);
    let x: number;
    let y: number;
    let z: number;

    if (r < 0.46) {
      // Rim band — the outline, at a random height through the slab.
      const p = outline[Math.floor(random(i * 7 + 2) * outline.length) % outline.length];
      x = p.x;
      z = p.y;
      y = (random(i * 7 + 3) * 2 - 1) * halfT;
    } else {
      // Top or bottom face — random point inside the outline, found by
      // shrinking toward the centre (cheap, uniform enough for a point cloud).
      const p = outline[Math.floor(random(i * 7 + 4) * outline.length) % outline.length];
      const k = Math.sqrt(random(i * 7 + 5)); // sqrt = area-uniform
      x = p.x * k;
      z = p.y * k;
      y = random(i * 7 + 6) > 0.5 ? halfT : -halfT;
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
};
