'use client';
import {QRCodeSVG} from 'qrcode.react';
export function RegistrationQr({token,title}:{token:string;title:string}){
 const value=`MFB-CHECKIN:${token}`;
 return <div className="event-qr"><QRCodeSVG value={value} size={180} level="M" marginSize={2}/><b>QR Code de presença</b><small>{title}</small><code>{token.slice(0,8).toUpperCase()}</code></div>
}
