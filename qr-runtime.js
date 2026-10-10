import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { createIcons, Camera, Square, ImageUp, UserX, RefreshCw } from 'lucide';

window.RobovQR = {
  render: (canvas, token) => QRCode.toCanvas(canvas, token, { width: 512, margin: 4, errorCorrectionLevel: 'M' }),
  decode: image => jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })?.data || null,
  icons: () => createIcons({ icons: { Camera, Square, ImageUp, UserX, RefreshCw } })
};
