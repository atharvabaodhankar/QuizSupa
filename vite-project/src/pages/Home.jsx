import { Box, Button, Container, Heading, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const getDashboardLink = () => {
    if (!user) return '/login'
    return user.user_metadata.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
  }

  return (
    <Box as="section" py={{ base: '12', md: '24' }}>
      <Container maxW="container.xl">
        <Stack spacing={{ base: '8', md: '12' }} align="center">
          <Stack spacing={{ base: '4', md: '6' }} textAlign="center">
            <Heading
              size={{ base: 'md', md: 'lg' }}
              fontWeight="bold"
              color={useColorModeValue('gray.700', 'white')}
            >
              Welcome to QuizSupa
            </Heading>
            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              color={useColorModeValue('gray.600', 'gray.300')}
              maxW="2xl"
            >
              Your modern platform for creating and taking MCQ tests. Perfect for teachers and students.
            </Text>
          </Stack>

          <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing="4"
            w="full"
            maxW="md"
            justify="center"
          >
            {!user ? (
              <>
                <Button
                  as={RouterLink}
                  to="/login"
                  size="lg"
                  colorScheme="blue"
                  w={{ base: 'full', md: 'auto' }}
                >
                  Sign In
                </Button>
                <Button
                  as={RouterLink}
                  to="/register"
                  size="lg"
                  variant="outline"
                  w={{ base: 'full', md: 'auto' }}
                >
                  Create Account
                </Button>
              </>
            ) : (
              <Button
                as={RouterLink}
                to={getDashboardLink()}
                size="lg"
                colorScheme="blue"
                w={{ base: 'full', md: 'auto' }}
              >
                Go to Dashboard
              </Button>
            )}
          </Stack>

          <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing="8"
            w="full"
            maxW="4xl"
            justify="center"
            mt={{ base: '8', md: '12' }}
          >
            <Box
              p="6"
              bg={bgColor}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="lg"
              flex="1"
              textAlign="center"
            >
              <Heading size="md" mb="4">
                For Teachers
              </Heading>
              <Text color={useColorModeValue('gray.600', 'gray.300')}>
                Create and manage MCQ tests, track student progress, and generate questions with AI.
              </Text>
            </Box>
            <Box
              p="6"
              bg={bgColor}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="lg"
              flex="1"
              textAlign="center"
            >
              <Heading size="md" mb="4">
                For Students
              </Heading>
              <Text color={useColorModeValue('gray.600', 'gray.300')}>
                Take tests, view results, and track your progress with detailed analytics.
              </Text>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
} 