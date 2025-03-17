import { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Textarea,
  useToast,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  HStack,
  Radio,
  RadioGroup,
  Spinner,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  FormHelperText,
  Switch,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react'

export default function AIQuizGenerator({ onQuizGenerated }) {
  const [topic, setTopic] = useState('')
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [contentData, setContentData] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [manualMCQData, setManualMCQData] = useState('')
  const [generationMode, setGenerationMode] = useState('topic')
  const toast = useToast()

  const handleGenerateQuiz = async () => {
    if (generationMode === 'topic' && !topic) {
      toast({
        title: 'Topic is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (generationMode === 'content' && !contentData) {
      toast({
        title: 'Content data is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (generationMode === 'manual' && !manualMCQData) {
      toast({
        title: 'MCQ data is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!apiKey) {
      toast({
        title: 'API Key is required',
        description: 'Please enter your Gemini API key',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setLoading(true)
    try {
      let prompt = ''
      let quizTitle = ''
      let quizDescription = ''

      if (generationMode === 'topic') {
        prompt = `Generate a multiple choice quiz about ${topic} with the following specifications:
          - Number of questions: ${numQuestions}
          - Difficulty level: ${difficulty}
          - Additional instructions: ${additionalInstructions}
          
          For each question, provide:
          1. The question text
          2. Four possible answers (A, B, C, D)
          3. The correct answer
          4. A brief explanation of why it's correct
          
          Format the response as a JSON array with objects containing:
          {
            "question": "question text",
            "options": ["option A", "option B", "option C", "option D"],
            "correctAnswer": "index of correct answer (0-3)",
            "explanation": "explanation text",
            "points": 1
          }`
        quizTitle = `${topic} Quiz`
        quizDescription = `AI-generated quiz about ${topic}. Difficulty: ${difficulty}`
      } else if (generationMode === 'content') {
        prompt = `Generate a multiple choice quiz based on the following content:
          "${contentData}"
          
          Specifications:
          - Number of questions: ${numQuestions}
          - Difficulty level: ${difficulty}
          - Additional instructions: ${additionalInstructions}
          
          For each question, provide:
          1. The question text
          2. Four possible answers (A, B, C, D)
          3. The correct answer
          4. A brief explanation of why it's correct
          
          Format the response as a JSON array with objects containing:
          {
            "question": "question text",
            "options": ["option A", "option B", "option C", "option D"],
            "correctAnswer": "index of correct answer (0-3)",
            "explanation": "explanation text",
            "points": 1
          }`
        quizTitle = `Content-based Quiz`
        quizDescription = `AI-generated quiz based on provided content. Difficulty: ${difficulty}`
      } else if (generationMode === 'manual') {
        // Parse the manual MCQ data
        try {
          const parsedQuestions = JSON.parse(manualMCQData)
          onQuizGenerated({
            title: topic || 'Custom Quiz',
            description: additionalInstructions || 'Custom quiz with manually provided questions',
            questions: parsedQuestions,
            duration: parsedQuestions.length * 2, // Estimate 2 minutes per question
            is_published: false,
            allow_unlimited_attempts: true
          })
          
          toast({
            title: 'Quiz created successfully!',
            status: 'success',
            duration: 3000,
            isClosable: true,
          })
          setLoading(false)
          return
        } catch (parseError) {
          throw new Error('Invalid JSON format for MCQ data. Please check your format and try again.')
        }
      }

      const response = await fetch('http://localhost:3000/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate quiz');
      }

      const data = await response.json();
      const generatedText = data.candidates[0].content.parts[0].text

      // Extract the JSON part from the response
      const jsonStr = generatedText.substring(
        generatedText.indexOf('['),
        generatedText.lastIndexOf(']') + 1
      )
      const questions = JSON.parse(jsonStr)

      onQuizGenerated({
        title: quizTitle,
        description: quizDescription,
        questions: questions,
        duration: numQuestions * 2, // Estimate 2 minutes per question
        is_published: false,
        allow_unlimited_attempts: true
      })

      toast({
        title: 'Quiz generated successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Error generating quiz:', error)
      toast({
        title: 'Error generating quiz',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      p={6}
      bg={useColorModeValue('white', 'gray.800')}
      borderWidth="1px"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      borderRadius="lg"
      w="full"
    >
      <Stack spacing={6}>
        <FormControl isRequired>
          <FormLabel>Gemini API Key</FormLabel>
          <InputGroup>
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
            />
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
            </InputRightElement>
          </InputGroup>
          <FormHelperText>
            Get a free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'blue.500' }}>Google AI Studio</a>
          </FormHelperText>
        </FormControl>

        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab onClick={() => setGenerationMode('topic')}>Generate from Topic</Tab>
            <Tab onClick={() => setGenerationMode('content')}>Generate from Content</Tab>
            <Tab onClick={() => setGenerationMode('manual')}>Provide MCQ Data</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Topic</FormLabel>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter the quiz topic (e.g., 'JavaScript Basics', 'World History')"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Number of Questions</FormLabel>
                  <NumberInput
                    value={numQuestions}
                    onChange={(value) => setNumQuestions(parseInt(value))}
                    min={1}
                    max={20}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Difficulty Level</FormLabel>
                  <RadioGroup value={difficulty} onChange={setDifficulty}>
                    <HStack spacing={4}>
                      <Radio value="easy">Easy</Radio>
                      <Radio value="medium">Medium</Radio>
                      <Radio value="hard">Hard</Radio>
                    </HStack>
                  </RadioGroup>
                </FormControl>

                <FormControl>
                  <FormLabel>Additional Instructions (Optional)</FormLabel>
                  <Textarea
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Any specific requirements or focus areas for the quiz"
                  />
                </FormControl>
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Content Data</FormLabel>
                  <Textarea
                    value={contentData}
                    onChange={(e) => setContentData(e.target.value)}
                    placeholder="Paste your content here (e.g., lecture notes, article, book chapter)"
                    minHeight="200px"
                  />
                  <FormHelperText>
                    The AI will generate questions based on this content
                  </FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Number of Questions</FormLabel>
                  <NumberInput
                    value={numQuestions}
                    onChange={(value) => setNumQuestions(parseInt(value))}
                    min={1}
                    max={20}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Difficulty Level</FormLabel>
                  <RadioGroup value={difficulty} onChange={setDifficulty}>
                    <HStack spacing={4}>
                      <Radio value="easy">Easy</Radio>
                      <Radio value="medium">Medium</Radio>
                      <Radio value="hard">Hard</Radio>
                    </HStack>
                  </RadioGroup>
                </FormControl>

                <FormControl>
                  <FormLabel>Additional Instructions (Optional)</FormLabel>
                  <Textarea
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Any specific requirements or focus areas for the quiz"
                  />
                </FormControl>
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={4}>
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Provide your own MCQ data</AlertTitle>
                    <AlertDescription>
                      Enter your questions in JSON format as shown in the example below
                    </AlertDescription>
                  </Box>
                </Alert>

                <FormControl>
                  <FormLabel>Quiz Title (Optional)</FormLabel>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter a title for your quiz"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Quiz Description (Optional)</FormLabel>
                  <Textarea
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Enter a description for your quiz"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>MCQ Data (JSON format)</FormLabel>
                  <Textarea
                    value={manualMCQData}
                    onChange={(e) => setManualMCQData(e.target.value)}
                    placeholder={`[
  {
    "question": "What is the capital of France?",
    "options": ["Berlin", "Madrid", "Paris", "Rome"],
    "correctAnswer": "2",
    "explanation": "Paris is the capital of France",
    "points": 1
  },
  {
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "1",
    "explanation": "2+2=4",
    "points": 1
  }
]`}
                    minHeight="300px"
                    fontFamily="monospace"
                  />
                  <FormHelperText>
                    Provide your questions in JSON format. The "correctAnswer" should be the index (0-3) of the correct option.
                  </FormHelperText>
                </FormControl>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Button
          colorScheme="blue"
          onClick={handleGenerateQuiz}
          isLoading={loading}
          loadingText={generationMode === 'manual' ? 'Creating Quiz...' : 'Generating Quiz...'}
          size="lg"
        >
          {generationMode === 'manual' ? 'Create Quiz' : 'Generate Quiz with AI'}
        </Button>
      </Stack>
    </Box>
  )
} 