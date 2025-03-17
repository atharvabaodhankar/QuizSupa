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
} from '@chakra-ui/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TakeTest() {
  const { testId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const progressBarRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [testAttempt, setTestAttempt] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    const fetchTest = async () => {
      try {
        // Fetch test details
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .select('*')
          .eq('id', testId)
          .single()

        if (testError) throw testError

        // Fetch questions and options
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select(`
            *,
            options (*)
          `)
          .eq('test_id', testId)

        if (questionsError) throw questionsError

        // Create test attempt
        const { data: testAttemptData, error: testAttemptError } = await supabase
          .from('test_attempts')
          .insert([
            {
              test_id: testId,
              user_id: user.id,
              started_at: new Date().toISOString(),
            },
          ])
          .select()
          .single()

        if (testAttemptError) throw testAttemptError

        setTest(testData)
        setQuestions(questionsData)
        setTimeLeft(testData.duration * 60)
        setTestAttempt(testAttemptData)
      } catch (error) {
        toast({
          title: 'Error loading test',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        navigate('/student/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchTest()
  }, [testId, user.id, navigate, toast])

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
      <Container maxW="container.md" py={8}>
        <Text>Loading test...</Text>
      </Container>
    )
  }

  if (!test) {
    return (
      <Container maxW="container.md" py={8}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Test not found</AlertTitle>
          <AlertDescription>
            The test you're looking for doesn't exist or you don't have permission to access it.
          </AlertDescription>
        </Alert>
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