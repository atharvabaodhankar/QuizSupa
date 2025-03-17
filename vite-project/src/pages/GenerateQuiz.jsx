import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  Button,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Spinner,
} from '@chakra-ui/react'
import AIQuizGenerator from '../components/AIQuizGenerator'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function GenerateQuiz() {
  const [generatedQuiz, setGeneratedQuiz] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      console.log('No user found, redirecting to login')
      navigate('/login')
      return
    }

    if (user.user_metadata?.role !== 'teacher') {
      console.log('User is not a teacher, redirecting to home')
      navigate('/')
      return
    }

    console.log('Authenticated user:', user)
  }, [user, navigate])

  const handleQuizGenerated = (quiz) => {
    setGeneratedQuiz(quiz)
    // Scroll to the preview section
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      })
    }, 100)
  }

  const handleSaveQuiz = async () => {
    try {
      if (!user || !user.id) {
        console.error('No authenticated user found:', user)
        toast({
          title: 'Authentication Error',
          description: 'Please log in to save the quiz.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/login');
        return;
      }

      if (!generatedQuiz) {
        toast({
          title: 'No Quiz Data',
          description: 'Please generate a quiz first.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      console.log('Saving quiz with user:', user.id)

      // First, create the test
      const { data: test, error: testError } = await supabase
        .from('tests')
        .insert([
          {
            title: generatedQuiz.title || 'Untitled Quiz',
            description: generatedQuiz.description || '',
            duration: generatedQuiz.duration || 30,
            is_published: false,
            created_by: user.id,
            allow_unlimited_attempts: generatedQuiz.allow_unlimited_attempts || false
          }
        ])
        .select()
        .single()

      if (testError) {
        console.error('Test creation error:', testError);
        throw testError;
      }

      if (!test || !test.id) {
        console.error('Test created but no ID returned:', test);
        throw new Error('Failed to get test ID after creation');
      }

      console.log('Test created:', test)

      // Then, create questions and their options
      for (const q of generatedQuiz.questions) {
        // Create the question
        const { data: question, error: questionError } = await supabase
          .from('questions')
          .insert([
            {
              test_id: test.id,
              text: q.question,
              explanation: q.explanation || '',
              points: q.points || 1
            }
          ])
          .select()
          .single()

        if (questionError) {
          console.error('Question creation error:', questionError);
          throw questionError;
        }

        if (!question || !question.id) {
          console.error('Question created but no ID returned:', question);
          throw new Error('Failed to get question ID after creation');
        }

        console.log('Question created:', question)

        // Create options for this question
        const optionsToInsert = q.options.map((optionText, index) => ({
          question_id: question.id,
          text: optionText || '',
          is_correct: index === parseInt(q.correctAnswer)
        }))

        const { error: optionsError } = await supabase
          .from('options')
          .insert(optionsToInsert)

        if (optionsError) {
          console.error('Options creation error:', optionsError);
          throw optionsError;
        }
      }

      // Log the test ID before navigation
      console.log('Test saved successfully with ID:', test.id);
      
      // Add a small delay to ensure the database operations are complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Double check that we have a valid test ID
      const { data: checkTest, error: checkError } = await supabase
        .from('tests')
        .select('id')
        .eq('id', test.id)
        .single();
        
      if (checkError || !checkTest) {
        console.error('Failed to verify test exists:', checkError || 'Test not found');
        throw new Error('Failed to verify test was created successfully');
      }

      toast({
        title: 'Quiz saved successfully!',
        description: 'You can now edit and publish it from your dashboard.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      // Navigate to edit page for the new test
      const editPath = `/teacher/edit-test/${test.id}`;
      console.log('Navigating to:', editPath);
      navigate(editPath);
    } catch (error) {
      console.error('Error saving quiz:', error)
      toast({
        title: 'Error saving quiz',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  return (
    <Container maxW="container.xl" py={{ base: '4', md: '8' }} px={{ base: '4', md: '8' }}>
      {loading ? (
        <Stack spacing={4} align="center">
          <Spinner size="xl" />
          <Text>Loading...</Text>
        </Stack>
      ) : (
        <Stack spacing={{ base: '6', md: '8' }}>
          <Stack>
            <Heading size={{ base: 'lg', md: 'xl' }}>Generate Quiz with AI</Heading>
            <Text color={useColorModeValue('gray.600', 'gray.300')}>
              Create a quiz using AI or by providing your own content
            </Text>
          </Stack>

          <Alert 
            status="info" 
            variant="subtle" 
            flexDirection="column" 
            alignItems="flex-start" 
            borderRadius="md"
            p={4}
          >
            <AlertTitle mb={2} fontSize="md">Three ways to create your quiz:</AlertTitle>
            <AlertDescription fontSize="sm">
              <Stack spacing={2}>
                <Text><strong>1. Generate from Topic:</strong> Enter a topic and let AI create questions about it</Text>
                <Text><strong>2. Generate from Content:</strong> Paste your lecture notes, article, or any text and AI will create questions from it</Text>
                <Text><strong>3. Provide MCQ Data:</strong> Enter your own questions in JSON format</Text>
              </Stack>
            </AlertDescription>
          </Alert>

          <AIQuizGenerator onQuizGenerated={handleQuizGenerated} />

          {generatedQuiz && (
            <Box
              p={{ base: '4', md: '6' }}
              bg={useColorModeValue('white', 'gray.800')}
              borderWidth="1px"
              borderColor={useColorModeValue('gray.200', 'gray.700')}
              borderRadius="lg"
              id="preview-section"
            >
              <Stack spacing={{ base: '4', md: '6' }}>
                <Heading size={{ base: 'md', md: 'lg' }}>Preview Generated Quiz</Heading>
                <Divider />
                
                <Stack spacing={2}>
                  <Text fontWeight="bold" fontSize={{ base: 'md', md: 'lg' }}>{generatedQuiz.title}</Text>
                  <Text fontSize={{ base: 'sm', md: 'md' }}>{generatedQuiz.description}</Text>
                  <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
                    {generatedQuiz.questions.length} questions • {generatedQuiz.duration} minutes
                  </Text>
                </Stack>
                
                <Stack spacing={{ base: '4', md: '6' }}>
                  {generatedQuiz.questions.map((question, index) => (
                    <Box 
                      key={index} 
                      p={{ base: '3', md: '4' }} 
                      bg={useColorModeValue('gray.50', 'gray.700')} 
                      borderRadius="md"
                    >
                      <Stack spacing={{ base: '2', md: '3' }}>
                        <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'md' }}>
                          Question {index + 1}: {question.question}
                        </Text>
                        <Stack pl={{ base: '2', md: '4' }} spacing={{ base: '1', md: '2' }}>
                          {question.options.map((option, optIndex) => (
                            <Text 
                              key={optIndex}
                              color={optIndex === parseInt(question.correctAnswer) ? 'green.500' : 'inherit'}
                              fontSize={{ base: 'xs', md: 'sm' }}
                            >
                              {String.fromCharCode(65 + optIndex)}. {option}
                            </Text>
                          ))}
                        </Stack>
                        <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
                          <Text as="span" fontWeight="medium">Explanation:</Text> {question.explanation}
                        </Text>
                      </Stack>
                    </Box>
                  ))}
                </Stack>

                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">Ready to save?</AlertTitle>
                    <AlertDescription fontSize="xs">
                      You'll be able to edit all questions after saving
                    </AlertDescription>
                  </Box>
                </Alert>

                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleSaveQuiz}
                  w={{ base: 'full', md: 'auto' }}
                >
                  Save Quiz & Continue to Edit
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </Container>
  )
} 