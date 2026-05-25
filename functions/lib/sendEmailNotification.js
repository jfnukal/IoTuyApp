"use strict";
// functions/src/sendEmailNotification.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailNotification = sendEmailNotification;
// TODO: Odkomentovat až bude SendGrid API key
// import * as sgMail from '@sendgrid/mail';
// sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
async function sendEmailNotification(userEmail, eventTitle, eventDate, eventTime) {
    // TODO: Implementovat až bude SendGrid API key
    console.log('📧 Email notifikace (zatím neimplementováno):', {
        userEmail,
        eventTitle,
        eventDate,
        eventTime,
    });
    /*
    const msg = {
      to: userEmail,
      from: 'notifications@yourapp.com',
      subject: `Připomínka: ${eventTitle}`,
      html: `
        <h2>Připomínka události</h2>
        <p><strong>${eventTitle}</strong></p>
        <p>Datum: ${eventDate}</p>
        ${eventTime ? `<p>Čas: ${eventTime}</p>` : ''}
      `
    };
    
    await sgMail.send(msg);
    */
}
//# sourceMappingURL=sendEmailNotification.js.map