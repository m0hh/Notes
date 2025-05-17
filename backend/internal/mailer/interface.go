package mailer

// MailSender is an interface for sending emails
type MailSender interface {
	Send(recipient, templateFile string, data interface{}) error
}
