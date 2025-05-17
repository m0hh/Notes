package tests

// MockMailer is a test implementation of the mailer functionality
type MockMailer struct {
	LastRecipient string
	LastTemplate  string
	LastData      interface{}
	CapturedToken string
}

// Send implements the mailer.MailSender interface for testing purposes
func (m *MockMailer) Send(recipient, templateFile string, data interface{}) error {
	m.LastRecipient = recipient
	m.LastTemplate = templateFile
	m.LastData = data

	if mailData, ok := data.(map[string]interface{}); ok {
		if token, ok := mailData["activationToken"].(string); ok {
			m.CapturedToken = token
		}
	}
	return nil
}
