import QRCode = require('qrcode');
import {createCanvas, loadImage} from 'canvas';
import dotenv = require('dotenv');
dotenv.config();

export async function createQR(txid: string) {
    const canvas = createCanvas(200, 200);
    QRCode.toCanvas(
        canvas,
        `${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/tickets/${txid}`,
        {
            errorConnectionLevel: 'L',
            width: 200,
            color: {
                dark: '#ffffff',
                light: '#434343'
            }
        }
    );
    const ctx = canvas.getContext("2d");
    const img = await loadImage('https://flashback.one/pub/icon_48x48.png');
    const center = (200 - 48) / 2;
    ctx.drawImage(img, center, center, 48, 48);
    return canvas.toDataURL("image/png").replace(/.+\,(.+)/g, '$1');
}

// createQR('upmDbAjzhz8dVUXMVS5XHHCCSUe2hhDJmcyUE2aECH6V4LXqH').then(res => console.log(res)).catch(err => console.log(err));
// QRCode.toDataURL(`https://test.flashback-general.one/tickets/D2gT4SkVF5q6bARLfDakne7nWUivQ5PRfZn59hpBD4vWSJsRN`, {
//     errorConnectionLevel: 'L',
//     width: 200,
//     color: {
//         dark: '#ffffff',
//         light: '#434343'
//     }
// }).then(res => console.log(res)).catch(err => console.log(err));