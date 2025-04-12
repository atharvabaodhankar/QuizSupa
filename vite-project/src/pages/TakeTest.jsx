import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Stack,
  Text,
  useToast,
  VStack,
  HStack,
  Radio,
  RadioGroup,
  Progress,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TakeTest() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const progressBarRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [testAttempt, setTestAttempt] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const initTest = async () => {
      if (!user) {
        console.log('No user found in TakeTest')
        setError('Please log in to take the test')
        setLoading(false)
        return
      }

      if (!id) {
        console.log('No test ID provided')
        setError('Invalid test ID')
        setLoading(false)
        return
      }

      try {
        console.log('Initializing test:', { testId: id, userId: user.id })
        await initializeTest()
      } catch (error) {
        console.error('Error in test initialization:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    initTest()
  }, [user, id])

  const initializeTest = async () => {
    try {
      setLoading(true)
      setError(null)

      // First check if the test exists and is published
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select(`
          *,
          questions (
            *,
            options (*)
          )
        `)
        .eq('id', id)
        .eq('is_published', true)
        .single()

      if (testError) {
        console.error('Error fetching test:', testError)
        throw new Error(testError.message)
      }

      if (!testData) {
        console.error('Test not found or not published')
        throw new Error('Test not found or not available')
      }

      console.log('Fetched test data:', testData)

      // Check if user has already attempted this test
      const { data: existingAttempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', id)
        .eq('student_id', user.id)
        .not('completed_at', 'is', null)

      if (attemptsError) {
        console.error('Error checking existing attempts:', attemptsError)
        throw new Error(attemptsError.message)
      }

      if (existingAttempts?.length > 0 && !testData.allow_unlimited_attempts) {
        console.error('Test already attempted')
        throw new Error('You have already attempted this test')
      }

      // Get student profile information
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, roll_number')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching student profile:', profileError)
        throw new Error(profileError.message)
      }

      // Create new test attempt
      console.log('Creating test attempt with student_id:', user.id)
      
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .insert({
          test_id: id,
          student_id: user.id,
          student_name: profileData.name,
          student_roll: profileData.roll_number,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (attemptError) {
        console.error('Error creating test attempt:', attemptError)
        throw new Error(attemptError.message)
      }

      console.log('Created test attempt:', attemptData)

      // Initialize state
      setTest(testData)
      setQuestions(testData.questions || [])
      setTimeLeft(testData.duration * 60) // Convert minutes to seconds
      setTestAttempt(attemptData)
      setCurrentQuestion(0)
      setAnswers({})

    } catch (error) {
      console.error('Error in initializeTest:', error)
      throw error
    }
  }

  const handleAnswerChange = useCallback((questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      // Calculate score
      const score = Object.entries(answers).reduce((acc, [questionId, optionId]) => {
        const question = questions.find((q) => q.id === questionId)
        const isCorrect = question.options.find((opt) => opt.id === optionId)?.is_correct
        return acc + (isCorrect ? question.points : 0)
      }, 0)

      // Update test attempt
      const { error: updateError } = await supabase
        .from('test_attempts')
        .update({
          completed_at: new Date().toISOString(),
          score,
        })
        .eq('id', testAttempt.id)

      if (updateError) throw updateError

      // Insert answers
      const answersToInsert = Object.entries(answers).map(([questionId, optionId]) => ({
        test_attempt_id: testAttempt.id,
        question_id: questionId,
        selected_option_id: optionId,
        is_correct: questions
          .find((q) => q.id === questionId)
          .options.find((opt) => opt.id === optionId)?.is_correct || false,
      }))

      const { error: answersError } = await supabase
        .from('answers')
        .insert(answersToInsert)

      if (answersError) throw answersError

      toast({
        title: 'Test submitted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      navigate('/student/dashboard')
    } catch (error) {
      toast({
        title: 'Error submitting test',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [answers, questions, testAttempt, isSubmitting, navigate, toast])

  useEffect(() => {
    if (!timeLeft) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, handleSubmit])

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Stack spacing={4} align="center">
          <Spinner size="xl" />
          <Text>Loading test...</Text>
        </Stack>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          <VStack align="start">
            <AlertTitle>Error loading test</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </VStack>
        </Alert>
        <Button mt={4} onClick={() => navigate('/student/dashboard')}>
          Return to Dashboard
        </Button>
      </Container>
    )
  }

  if (!test || !testAttempt) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          <VStack align="start">
            <AlertTitle>Test not found</AlertTitle>
            <AlertDescription>The requested test could not be loaded.</AlertDescription>
          </VStack>
        </Alert>
        <Button mt={4} onClick={() => navigate('/student/dashboard')}>
          Return to Dashboard
        </Button>
      </Container>
    )
  }

  return (
    <Container maxW="container.md" py={8}>
      <Stack spacing={8}>
        <Stack>
          <Heading size="lg">{test.title}</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.300')}>
            {test.description}
          </Text>
        </Stack>

        <Box
          p={6}
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
        >
          <Stack spacing={6}>
            <HStack justify="space-between">
              <Text fontWeight="bold">
                Question {currentQuestion + 1} of {questions.length}
              </Text>
              <Text fontWeight="bold">
                Time left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </Text>
            </HStack>

            <Progress
              value={(currentQuestion / questions.length) * 100}
              size="sm"
              colorScheme="blue"
              borderRadius="full"
            />

            <Box>
              <Text fontSize="lg" mb={4}>
                {questions[currentQuestion].text}
              </Text>
              <RadioGroup
                value={answers[questions[currentQuestion].id] || ''}
                onChange={(value) =>
                  handleAnswerChange(questions[currentQuestion].id, value)
                }
              >
                <Stack spacing={4}>
                  {questions[currentQuestion].options.map((option) => (
                    <Radio key={option.id} value={option.id}>
                      {option.text}
                    </Radio>
                  ))}
                </Stack>
              </RadioGroup>
            </Box>

            <HStack justify="space-between">
              <Button
                onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                isDisabled={currentQuestion === 0}
              >
                Previous
              </Button>
              {currentQuestion === questions.length - 1 ? (
                <Button
                  colorScheme="blue"
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                >
                  Submit Test
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    setCurrentQuestion((prev) =>
                      Math.min(questions.length - 1, prev + 1)
                    )
                  }
                >
                  Next
                </Button>
              )}
            </HStack>
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
} 