import { Injectable } from '@nestjs/common';
import { db } from 'src/firebase/admin';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user: 'bienvenida@impactnow.world',
        pass: 'Impactnow.@',
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  async sendEmailNewUser(id_user: string) {
    const user = await db.collection('users').doc(id_user).get();

    const template = `
      <div>
        <!--[if (gte mso 9)|(IE)]>
        <table width="700" border="0" cellspacing="0" cellpadding="0" style="width: 700px;">
        <tr><td>
        <![endif]-->
        <table border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width: 700px;">
        <tr><td align="center" valign="middle" bgcolor="#ffffff" style="padding: 30px 10px;">
          <div>
            <div>
              <!--[if (gte mso 9)|(IE)]>
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px;">
              <tr><td>
              <![endif]-->
              <table border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width: 600px;">
              <tr><td align="center" valign="middle">
                <div>
                  <div>
                    <table border="0" cellspacing="0" cellpadding="0" width="100%">
                    <tr><td align="center" valign="middle" height="107" style="height: 107px;">
                      <div>
                        <a href="#" target="_blank" style="font-family: Arial, sans-serif; font-size: 14px; color: #000000;"><img src="https://backoffice.empowerittop.com/img/email/i-1303443312.png" width="598" height="107" alt="" border="0" style="display: block; border-radius: 10px;"></a>
                      </div>
                    </td></tr>
                    </table>
                  </div> 
                  <div style="height: 20px; line-height: 20px; font-size: 18px;">&nbsp;</div>
                  <div>
                    <table border="0" cellspacing="0" cellpadding="0" width="100%">
                    <tr><td align="left" valign="top">
                      <div>
                        <div>
                          <table border="0" cellspacing="0" cellpadding="0" width="100%">
                          <tr><td align="center">
                            <div>
                              <div style="line-height: 43px;">
                                <span style="font-family: Helvetica, sans-serif; font-weight: bold; font-size: 36px; color: #040404;"><span style="text-decoration: none;">¡Felicidades!<br></span><span style="font-size: 20px; text-decoration: none;">
                                ${user.get('name')}</span></span>
                              </div>
                            </div>
                          </td></tr>
                          </table>
                        </div>
                      </div>
                    </td></tr>
                    </table>
                  </div> 
                  <div style="height: 20px; line-height: 20px; font-size: 18px;">&nbsp;</div>
                  <div>
                    <table border="0" cellspacing="0" cellpadding="0" width="100%">
                    <tr><td align="left" valign="top" height="442" style="height: 442px;">
                      <div>
                        <div>
                          <table border="0" cellspacing="0" cellpadding="0" width="100%">
                          <tr><td align="center">
                            <div>
                              <div style="line-height: 20px;">
                                <span style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229;">Hoy marcas el inicio de un nuevo capítulo en tu vida. Has tomado una decisión que puede cambiarlo todo. NOW es más que una oportunidad: es una compañia, es un movimiento, una mentalidad, una nueva forma de vivir.<br><br></span>
                                <span style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229;">Aquí encontrarás conocimiento, liderazgo, comunidad y las herramientas para construir la vida que siempre soñaste.  <br><br></span>
                                <span style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229;">No estás solo. Estás rodeado de personas que piensan en grande, que actúan en grande y que van a lo más alto.<br><br></span>
                                <span style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229; font-weight: bold;">AHORA es tu momento. 🌎🔥<br><br></span>
                               
                              </div> 
                              <div style="height: 16px; line-height: 16px; font-size: 14px;">&nbsp;</div>
                            </div>
                          </td></tr>
                          </table>
                        </div> 
                        <div>
                          <table border="0" cellspacing="0" cellpadding="0" width="100%">
                          <tr><td align="center" valign="middle" height="398" bgcolor="#ffffff" style="height: 398px;">
                            <div>
                              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                              <tr><td align="center" valign="middle" style="font-size: 0px;">
                                <div style="display: inline-block; vertical-align: middle; width: 100%; max-width: 300px;">
                                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                                  <tr><td align="undefined" valign="top" class="outf14" style="font-size: large;">
                                    <div>
                                      <a href="#" target="_blank" style="font-family: Arial, sans-serif; font-size: 14px; color: #000000;"><img src="https://firebasestorage.googleapis.com/v0/b/empowerit-top-digital.firebasestorage.app/o/now-logo-3.png?alt=media&token=f31b960b-8a82-4a43-a51d-374fffca55d1" width="300" alt="" border="0" style="display: block; border-radius: 0px; max-width: 300px; width: 100%;" class="w300px"></a>
                                    </div>
                                  </td></tr>
                                  </table>
                                </div>
                                <!--[if (gte mso 9)|(IE)]>
                                </td>
                                <td valign="middle" width="300" style="width: 300px">
                                <![endif]-->
                                <div style="display: inline-block; vertical-align: middle; width: 100%; max-width: 300px;">
                                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                                  <tr><td align="center" valign="top" class="outf14" style="font-size: large;">
                                    <div>
                                      <table border="0" cellspacing="0" cellpadding="0" width="100%">
                                      <tr><td align="center" valign="middle" height="396" bgcolor="#f3f7fc" style="height: 396px;">
                                        <div>
                                          <div>
                                            <table border="0" cellspacing="0" cellpadding="0" width="100%">
                                            <tr><td align="center" valign="middle" height="181" style="padding: 0px 20px; height: 181px;">
                                              <div>
                                                <div style="line-height: 20px;">
                                                 <span style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229; font-weight: bold;">🚀 ¿Cuál es el siguiente paso?<br><br></span>
                                <span style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229; ">🔹 Ingresa a tu plataforma: <a href="https://impactnow.world" target="_blank">IMPACT NOW</a><br><br></span>
                                <span style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229; ">🔹 Conéctate con la comunidad NOW<br><br></span>
                                <span style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229; ">🔹 Sigue a nuestro CEO en instagram: Saulzavalamx<br><br></span>
                                <span style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229; ">🔹 Comienza tu camino hacia la grandeza<br><br></span>
                                  
                                                </div>
                                              </div>
                                            </td></tr>
                                            </table>
                                          </div> 
                                          <div style="height: 10px; line-height: 10px; font-size: 8px;">&nbsp;</div>
                                        </div>
                                      </td></tr>
                                      </table>
                                    </div>
                                  </td></tr>
                                  </table>
                                </div>
                              </td></tr>
                              </table>
                            </div>
                          </td></tr>
                          </table>
                        </div>
                      </div>
                    </td></tr>
                    </table>
                  </div> 
                  <div style="height: 20px; line-height: 20px; font-size: 18px;">&nbsp;</div>
                  <div>
                    <table border="0" cellspacing="0" cellpadding="0" width="100%">
                    <tr><td align="center" valign="top" bgcolor="#040404" style="padding: 10px 0px; border-radius: 0px 0px 10px 10px;">
                      <div>
                        <div>
                          <table border="0" cellspacing="0" cellpadding="0" width="100%">
                          <tr><td align="center" valign="top" style="padding: 0px 0px 10px;">
                            <div>
                              <div style="line-height: 14px;">
                                <span style="font-family: Inter, sans-serif; font-size: 12px; color: #b9b9b9;">Este correo es de uso administrativo <br>© 2025 IMPACT NOW todos los derechos reservados</span>
                              </div>
                            </div>
                          </td></tr>
                          </table>
                        </div>
                      </div>
                    </td></tr>
                    </table>
                  </div>
                </div>
              </td></tr>
              </table>
              <!--[if (gte mso 9)|(IE)]>
              </td></tr>
              </table>
              <![endif]-->
            </div>
          </div>
        </td></tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td></tr>
        </table>
        <![endif]-->
      </div>
      </td></tr>
      </table> 
      </div> 
    `;
    const mailOptions = {
      from: 'bienvenida@impactnow.world',
      to: user.get('email'),
      subject: 'Bienvenido a la familia IMPACT NOW',
      text: 'Bienvenido a la familia IMPACT NOW ¡¡' + user.get('name') + '!!',
      html: template,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email: ', error);
          reject(error);
        } else {
          console.log('Email sent: ', info.response);
          resolve(info.response);
        }
      });
    });
  }
}
