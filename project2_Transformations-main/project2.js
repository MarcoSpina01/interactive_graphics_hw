// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform(positionX, positionY, rotation, scale) {
	var rad = rotation * Math.PI / 180;
	var cos = Math.cos(rad);
	var sin = Math.sin(rad);

	// Combined transformation matrix: T * R * S
	// In row-major form:
	// [ cos*scale,  -sin*scale, positionX ]
	// [ sin*scale,   cos*scale, positionY ]
	// [ 0,           0,         1         ]

	return [
		cos * scale,
		sin * scale,
		0,
		-sin * scale,
		cos * scale,
		0,
		positionX,
		positionY,
		1
	];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation should first apply trans1 and then trans2.
function ApplyTransform(trans1, trans2) {
	// The combined transformation is: trans2 * trans1.
	var result = new Array(9);

	for (var row = 0; row < 3; row++) {
		for (var col = 0; col < 3; col++) {
			var sum = 0;
			// Compute element (row, col):
			for (var k = 0; k < 3; k++) {
				// trans2 element at (row, k): index = k*3 + row
				// trans1 element at (k, col): index = col*3 + k
				sum += trans2[k * 3 + row] * trans1[col * 3 + k];
			}
			// Set the result in column-major order.
			result[col * 3 + row] = sum;
		}
	}
	return result;
}