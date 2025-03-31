// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos) {
    // Dimensions of background and foreground images.
    const bgWidth = bgImg.width;
    const bgHeight = bgImg.height;
    const fgWidth = fgImg.width;
    const fgHeight = fgImg.height;

    // Determine the overlapping region on the background image.
    // If fgPos.x or fgPos.y is negative, only a part of fgImg will be used.
    const startX = Math.max(0, fgPos.x);
    const startY = Math.max(0, fgPos.y);
    const endX = Math.min(bgWidth, fgPos.x + fgWidth);
    const endY = Math.min(bgHeight, fgPos.y + fgHeight);

    // Loop over every pixel in the overlapping region.
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            // Determine corresponding pixel in the foreground image.
            const fgX = x - fgPos.x;
            const fgY = y - fgPos.y;

            // Calculate the index into the one-dimensional array for both images.
            const bgIndex = (y * bgWidth + x) * 4;
            const fgIndex = (fgY * fgWidth + fgX) * 4;

            // Get the effective foreground alpha (normalize to [0,1] and scale by fgOpac).
            const fgAlpha = (fgImg.data[fgIndex + 3] / 255) * fgOpac;
            const invAlpha = 1 - fgAlpha;

            // Blend each color channel.
            bgImg.data[bgIndex]     = fgImg.data[fgIndex]     * fgAlpha + bgImg.data[bgIndex]     * invAlpha;
            bgImg.data[bgIndex + 1] = fgImg.data[fgIndex + 1] * fgAlpha + bgImg.data[bgIndex + 1] * invAlpha;
            bgImg.data[bgIndex + 2] = fgImg.data[fgIndex + 2] * fgAlpha + bgImg.data[bgIndex + 2] * invAlpha;

            // Blend the alpha channel.
            const bgAlpha = bgImg.data[bgIndex + 3] / 255;
            const outAlpha = fgAlpha + bgAlpha * invAlpha;
            bgImg.data[bgIndex + 3] = outAlpha * 255;
        }
    }
}