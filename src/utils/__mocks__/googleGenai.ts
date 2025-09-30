export class GoogleGenerativeAI {
  constructor(_apiKey: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock constructor - parameter intentionally unused
  }

  getGenerativeModel = jest.fn(() => ({
    generateContent: jest.fn(() => Promise.resolve({
      response: {
        text: () => 'Mock AI response'
      }
    }))
  }))
}

export const GoogleGenAI = GoogleGenerativeAI;
