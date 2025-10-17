// functions/src/sendEmailNotification.ts

// TODO: Odkomentovat až bude SendGrid API key
// import * as sgMail from '@sendgrid/mail';
// sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendEmailNotification(
  userEmail: string,
  eventTitle: string,
  eventDate: string,
  eventTime?: string
): Promise<void> {
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
