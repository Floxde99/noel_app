import { formatDate, formatTime } from '@/lib/utils'

interface TaskReminderData {
  taskTitle: string
  taskDescription?: string
  dueDate: string
  eventName: string
  eventLocation?: string
  userName: string
}

interface EventReminderData {
  eventName: string
  eventDescription?: string
  date: string
  endDate?: string
  location?: string
  userName: string
}

export function generateTaskReminderEmail(data: TaskReminderData): { subject: string; text: string; html: string } {
  const subject = `🎄 Rappel : ${data.taskTitle}`
  
  const text = `
Bonjour ${data.userName},

Vous avez une tâche à accomplir prochainement :

📋 ${data.taskTitle}
${data.taskDescription ? `\n${data.taskDescription}\n` : ''}
⏰ Échéance : ${formatDate(data.dueDate)} à ${formatTime(data.dueDate)}
🎄 Événement : ${data.eventName}
${data.eventLocation ? `📍 Lieu : ${data.eventLocation}\n` : ''}

Connectez-vous pour plus de détails : ${process.env.NEXT_PUBLIC_APP_URL}

Bonnes fêtes ! 🎅
L'application Noël Famille
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .task-box { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎄 Rappel de Tâche</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.userName}</strong>,</p>
      <p>Vous avez une tâche à accomplir prochainement :</p>
      
      <div class="task-box">
        <h2 style="margin-top: 0; color: #10b981;">📋 ${data.taskTitle}</h2>
        ${data.taskDescription ? `<p style="margin: 10px 0;">${data.taskDescription}</p>` : ''}
        <p style="margin: 10px 0;"><strong>⏰ Échéance :</strong> ${formatDate(data.dueDate)} à ${formatTime(data.dueDate)}</p>
        <p style="margin: 10px 0;"><strong>🎄 Événement :</strong> ${data.eventName}</p>
        ${data.eventLocation ? `<p style="margin: 10px 0;"><strong>📍 Lieu :</strong> ${data.eventLocation}</p>` : ''}
      </div>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Voir les détails</a>
    </div>
    <div class="footer">
      <p>Bonnes fêtes ! 🎅</p>
      <p>L'application Noël Famille</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  return { subject, text, html }
}

export function generateEventReminderEmail(data: EventReminderData): { subject: string; text: string; html: string } {
  const subject = `🎄 Rappel : ${data.eventName}`
  
  const text = `
Bonjour ${data.userName},

Un événement approche :

🎄 ${data.eventName}
${data.eventDescription ? `\n${data.eventDescription}\n` : ''}
📅 Date : ${formatDate(data.date)}${data.endDate ? ` - ${formatDate(data.endDate)}` : ''}
⏰ Heure : ${formatTime(data.date)}
${data.location ? `📍 Lieu : ${data.location}\n` : ''}

Connectez-vous pour consulter les détails : ${process.env.NEXT_PUBLIC_APP_URL}

À bientôt ! 🎅
L'application Noël Famille
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .event-box { background: white; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎄 Rappel d'Événement</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.userName}</strong>,</p>
      <p>Un événement approche :</p>
      
      <div class="event-box">
        <h2 style="margin-top: 0; color: #ef4444;">🎄 ${data.eventName}</h2>
        ${data.eventDescription ? `<p style="margin: 10px 0;">${data.eventDescription}</p>` : ''}
        <p style="margin: 10px 0;"><strong>📅 Date :</strong> ${formatDate(data.date)}${data.endDate ? ` - ${formatDate(data.endDate)}` : ''}</p>
        <p style="margin: 10px 0;"><strong>⏰ Heure :</strong> ${formatTime(data.date)}</p>
        ${data.location ? `<p style="margin: 10px 0;"><strong>📍 Lieu :</strong> ${data.location}</p>` : ''}
      </div>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Voir les détails</a>
    </div>
    <div class="footer">
      <p>À bientôt ! 🎅</p>
      <p>L'application Noël Famille</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  return { subject, text, html }
}
