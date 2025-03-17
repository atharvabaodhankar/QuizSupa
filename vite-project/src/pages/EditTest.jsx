import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  Textarea,
  Switch,
  IconButton,
  useToast,
  VStack,
  HStack,
  useColorModeValue,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Checkbox,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon } from '@chakra-ui/icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function EditTest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Log initial state
        console.log('EditTest mounted with params:', { id, user })

        // Validate user authentication
        if (!user) {
          console.log('No user found, redirecting to login')
          toast({
            title: 'Authentication required',
            description: 'Please log in to edit tests',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
          navigate('/login')
          return
        }

        // Validate user role
        if (user.user_metadata?.role !== 'teacher') {
          console.log('User is not a teacher, redirecting to home')
          toast({
            title: 'Access denied',
            description: 'Only teachers can edit tests',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
          navigate('/')
          return
        }

        // Validate test ID
        if (!id) {
          console.error('No test ID provided in route params')
          toast({
            title: 'Error',
            description: 'No test ID provided',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
          navigate('/teacher/dashboard')
          return
        }

        // Fetch test data
        await fetchTest()
      } catch (error) {
        console.error('Error in initialization:', error)
        setError(error.message)
      }
    }

    initializeComponent()
  }, [id, user, navigate])

  const fetchTest = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching test data for ID:', id)

      // Fetch test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', id)
        .single()

      if (testError) {
        console.error('Error fetching test:', testError)
        throw new Error('Failed to fetch test data. Please try again.')
      }

      if (!testData) {
        console.error('Test not found:', id)
        throw new Error('Test not found')
      }

      console.log('Test data fetched:', testData)

      // Verify ownership
      if (testData.created_by !== user.id) {
        console.error('Access denied: Test belongs to different user')
        throw new Error('You do not have permission to edit this test')
      }

      // Fetch questions and options
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          options (*)
        `)
        .eq('test_id', id)
        .order('created_at', { ascending: true })

      if (questionsError) {
        console.error('Error fetching questions:', questionsError)
        throw new Error('Failed to fetch test questions. Please try again.')
      }

      console.log('Questions data fetched:', questionsData)

      setTest(testData)
      setQuestions(questionsData || [])
    } catch (error) {
      console.error('Error in fetchTest:', error)
      setError(error.message)
      toast({
        title: 'Error loading test',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      // Only navigate away for certain errors
      if (error.message === 'Test not found' || error.message.includes('permission')) {
        navigate('/teacher/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTestChange = (e) => {
    const { name, value, type, checked } = e.target
    setTest((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions]
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value,
    }
    setQuestions(newQuestions)
  }

  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options[optionIndex] = {
      ...newQuestions[questionIndex].options[optionIndex],
      [field]: value,
    }
    setQuestions(newQuestions)
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        test_id: id,
        text: '',
        explanation: '',
        points: 1,
        options: [
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ],
      },
    ])
  }

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const addOption = (questionIndex) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options.push({
      text: '',
      is_correct: false,
    })
    setQuestions(newQuestions)
  }

  const removeOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter(
      (_, i) => i !== optionIndex
    )
    setQuestions(newQuestions)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Update test
      const { error: testError } = await supabase
        .from('tests')
        .update({
          title: test.title,
          description: test.description,
          duration: test.duration,
          is_published: test.is_published,
          allow_unlimited_attempts: test.allow_unlimited_attempts,
        })
        .eq('id', id)

      if (testError) throw testError

      // Update questions
      for (const question of questions) {
        if (question.id) {
          // Update existing question
          const { error: questionError } = await supabase
            .from('questions')
            .update({
              text: question.text,
              explanation: question.explanation,
              points: question.points,
            })
            .eq('id', question.id)

          if (questionError) throw questionError

          // Update options
          for (const option of question.options) {
            if (option.id) {
              // Update existing option
              const { error: optionError } = await supabase
                .from('options')
                .update({
                  text: option.text,
                  is_correct: option.is_correct,
                })
                .eq('id', option.id)

              if (optionError) throw optionError
            } else {
              // Insert new option
              const { error: optionError } = await supabase.from('options').insert({
                question_id: question.id,
                text: option.text,
                is_correct: option.is_correct,
              })

              if (optionError) throw optionError
            }
          }
        } else {
          // Insert new question
          const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .insert({
              test_id: id,
              text: question.text,
              explanation: question.explanation,
              points: question.points,
            })
            .select()
            .single()

          if (questionError) throw questionError

          // Insert options
          const { error: optionsError } = await supabase.from('options').insert(
            question.options.map((option) => ({
              question_id: questionData.id,
              text: option.text,
              is_correct: option.is_correct,
            }))
          )

          if (optionsError) throw optionsError
        }
      }

      toast({
        title: 'Test updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      navigate('/teacher/dashboard')
    } catch (error) {
      toast({
        title: 'Error updating test',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      {loading ? (
        <Stack spacing={4} align="center">
          <Spinner size="xl" />
          <Text>Loading test...</Text>
        </Stack>
      ) : error ? (
        <Alert status="error">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      ) : !test ? (
        <Alert status="error">
          <AlertIcon />
          <Text>Failed to load test. Please try again.</Text>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack spacing={8}>
            <Stack>
              <Heading size="lg">Edit Test</Heading>
              <Text color="gray.600">Update your test details and questions</Text>
            </Stack>

            <Box p={6} bg={bgColor} borderRadius="lg" boxShadow="sm">
              <Stack spacing={6}>
                <FormControl>
                  <FormLabel>Test Title</FormLabel>
                  <Input
                    name="title"
                    value={test.title}
                    onChange={handleTestChange}
                    required
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    name="description"
                    value={test.description}
                    onChange={handleTestChange}
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <NumberInput
                    value={test.duration}
                    onChange={(value) =>
                      handleTestChange({
                        target: { name: 'duration', value: parseInt(value) },
                      })
                    }
                    min={1}
                    max={180}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Published</FormLabel>
                  <Switch
                    name="is_published"
                    isChecked={test.is_published}
                    onChange={handleTestChange}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Allow Unlimited Attempts</FormLabel>
                  <Switch
                    name="allow_unlimited_attempts"
                    isChecked={test.allow_unlimited_attempts}
                    onChange={handleTestChange}
                  />
                </FormControl>
              </Stack>
            </Box>

            <Stack spacing={6}>
              <HStack justify="space-between">
                <Heading size="md">Questions</Heading>
                <Button leftIcon={<AddIcon />} onClick={addQuestion}>
                  Add Question
                </Button>
              </HStack>

              {questions.map((question, questionIndex) => (
                <Box
                  key={questionIndex}
                  p={6}
                  bg={bgColor}
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderRadius="lg"
                >
                  <Stack spacing={4}>
                    <HStack justify="space-between">
                      <Heading size="sm">Question {questionIndex + 1}</Heading>
                      <IconButton
                        icon={<DeleteIcon />}
                        onClick={() => removeQuestion(questionIndex)}
                        colorScheme="red"
                        variant="ghost"
                      />
                    </HStack>

                    <FormControl isRequired>
                      <FormLabel>Question Text</FormLabel>
                      <Textarea
                        value={question.text}
                        onChange={(e) =>
                          handleQuestionChange(questionIndex, 'text', e.target.value)
                        }
                        rows={3}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Explanation</FormLabel>
                      <Textarea
                        value={question.explanation}
                        onChange={(e) =>
                          handleQuestionChange(
                            questionIndex,
                            'explanation',
                            e.target.value
                          )
                        }
                        rows={2}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Points</FormLabel>
                      <NumberInput
                        value={question.points}
                        onChange={(value) =>
                          handleQuestionChange(
                            questionIndex,
                            'points',
                            parseInt(value)
                          )
                        }
                        min={1}
                        max={10}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <Stack spacing={4}>
                      <HStack justify="space-between">
                        <FormLabel>Options</FormLabel>
                        <Button
                          size="sm"
                          leftIcon={<AddIcon />}
                          onClick={() => addOption(questionIndex)}
                        >
                          Add Option
                        </Button>
                      </HStack>

                      {question.options?.map((option, optionIndex) => (
                        <HStack key={optionIndex}>
                          <FormControl flex="1">
                            <Input
                              value={option.text}
                              onChange={(e) =>
                                handleOptionChange(
                                  questionIndex,
                                  optionIndex,
                                  'text',
                                  e.target.value
                                )
                              }
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                          </FormControl>

                          <Checkbox
                            isChecked={option.is_correct}
                            onChange={(e) =>
                              handleOptionChange(
                                questionIndex,
                                optionIndex,
                                'is_correct',
                                e.target.checked
                              )
                            }
                          >
                            Correct
                          </Checkbox>

                          <IconButton
                            icon={<DeleteIcon />}
                            onClick={() => removeOption(questionIndex, optionIndex)}
                            colorScheme="red"
                            variant="ghost"
                          />
                        </HStack>
                      ))}
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              isLoading={loading}
            >
              Save Changes
            </Button>
          </Stack>
        </form>
      )}
    </Container>
  )
} 