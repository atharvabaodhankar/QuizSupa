import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  useToast,
  VStack,
  HStack,
  IconButton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Textarea,
  Divider,
  Checkbox,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon } from '@chakra-ui/icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function CreateTest() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const [test, setTest] = useState({
    title: '',
    description: '',
    duration: 30,
    is_published: false,
    allow_unlimited_attempts: false,
  })

  const [questions, setQuestions] = useState([
    {
      text: '',
      explanation: '',
      points: 1,
      options: [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
    },
  ])

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
    setLoading(true)

    try {
      // Create test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert([
          {
            title: test.title,
            description: test.description,
            duration: test.duration,
            is_published: test.is_published,
            allow_unlimited_attempts: test.allow_unlimited_attempts,
            created_by: user.id,
          },
        ])
        .select()
        .single()

      if (testError) throw testError

      // Create questions and options
      for (const question of questions) {
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert([
            {
              test_id: testData.id,
              text: question.text,
              explanation: question.explanation,
              points: question.points,
            },
          ])
          .select()
          .single()

        if (questionError) throw questionError

        const { error: optionsError } = await supabase.from('options').insert(
          question.options.map((option) => ({
            question_id: questionData.id,
            text: option.text,
            is_correct: option.is_correct,
          }))
        )

        if (optionsError) throw optionsError
      }

      toast({
        title: 'Test created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      navigate('/teacher/dashboard')
    } catch (error) {
      toast({
        title: 'Error creating test',
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
    <Container maxW="container.xl" py={{ base: '8', md: '12' }}>
      <form onSubmit={handleSubmit}>
        <Stack spacing={8}>
          <Stack>
            <Heading size="lg">Create New Test</Heading>
            <Text color="gray.600">Fill in the details for your new MCQ test</Text>
          </Stack>

          <Box p={6} bg="white" borderRadius="lg" boxShadow="sm">
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
                <Input
                  type="number"
                  value={test.duration}
                  onChange={(e) => handleTestChange('duration', parseInt(e.target.value))}
                  min={1}
                  max={180}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Publish immediately</FormLabel>
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
            <Stack direction="row" justify="space-between" align="center">
              <Heading size="md">Questions</Heading>
              <Button
                leftIcon={<AddIcon />}
                onClick={addQuestion}
                colorScheme="blue"
              >
                Add Question
              </Button>
            </Stack>

            {questions.map((question, questionIndex) => (
              <Box
                key={questionIndex}
                p={6}
                bg="white"
                borderRadius="lg"
                boxShadow="sm"
              >
                <Stack spacing={6}>
                  <Stack direction="row" justify="space-between" align="center">
                    <Heading size="sm">Question {questionIndex + 1}</Heading>
                    {questions.length > 1 && (
                      <IconButton
                        icon={<DeleteIcon />}
                        onClick={() => removeQuestion(questionIndex)}
                        colorScheme="red"
                        variant="ghost"
                      />
                    )}
                  </Stack>

                  <FormControl>
                    <FormLabel>Question Text</FormLabel>
                    <Textarea
                      value={question.text}
                      onChange={(e) =>
                        handleQuestionChange(questionIndex, 'text', e.target.value)
                      }
                      rows={3}
                      required
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Explanation (optional)</FormLabel>
                    <Textarea
                      value={question.explanation}
                      onChange={(e) =>
                        handleQuestionChange(questionIndex, 'explanation', e.target.value)
                      }
                      rows={2}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Points</FormLabel>
                    <NumberInput
                      value={question.points}
                      onChange={(value) =>
                        handleQuestionChange(questionIndex, 'points', parseInt(value))
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

                  <Divider />

                  <Stack spacing={4}>
                    <Stack direction="row" justify="space-between" align="center">
                      <Heading size="sm">Options</Heading>
                      <Button
                        leftIcon={<AddIcon />}
                        onClick={() => addOption(questionIndex)}
                        size="sm"
                        colorScheme="blue"
                      >
                        Add Option
                      </Button>
                    </Stack>

                    {question.options.map((option, optionIndex) => (
                      <HStack key={optionIndex}>
                        <FormControl isRequired flex="1">
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

          <Stack direction="row" spacing={4} justify="flex-end">
            <Button
              onClick={() => navigate('/teacher/dashboard')}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={loading}
            >
              Create Test
            </Button>
          </Stack>
        </Stack>
      </form>
    </Container>
  )
} 