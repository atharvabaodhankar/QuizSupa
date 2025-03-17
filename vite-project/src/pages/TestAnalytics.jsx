import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  SimpleGrid,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TestAnalytics() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [test, setTest] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [analytics, setAnalytics] = useState({
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
    highestScore: 0,
    lowestScore: 0,
  })

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) {
        setError('Please log in to view analytics')
        setLoading(false)
        return
      }

      if (!id) {
        setError('No test ID provided')
        setLoading(false)
        return
      }

      try {
        console.log('Loading analytics for test:', id)
        await fetchTestData()
      } catch (error) {
        console.error('Error loading analytics:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [user, id])

  const fetchTestData = async () => {
    try {
      console.log('Fetching test data for ID:', id)
      
      // Fetch test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select(`
          *,
          questions (
            id,
            points
          )
        `)
        .eq('id', id)
        .single()

      if (testError) {
        console.error('Error fetching test:', testError)
        throw new Error(testError.message)
      }

      if (!testData) {
        console.error('Test not found')
        throw new Error('Test not found')
      }

      console.log('Fetched test data:', testData)

      // Calculate total possible points
      const calculatedTotalPoints = testData.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0
      console.log('Total points:', calculatedTotalPoints)
      setTotalPoints(calculatedTotalPoints)

      // Verify ownership
      if (testData.created_by !== user.id) {
        throw new Error('You do not have permission to view this test\'s analytics')
      }

      // Fetch test attempts with user profiles
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          profiles!user_id (
            role
          )
        `)
        .eq('test_id', id)
        .not('completed_at', 'is', null) // Only get completed attempts
        .order('created_at', { ascending: false })

      if (attemptsError) {
        console.error('Error fetching attempts:', attemptsError)
        throw new Error(attemptsError.message)
      }

      console.log('Fetched attempts data:', attemptsData)

      // Calculate analytics
      const totalAttempts = attemptsData.length
      const scores = attemptsData.map((attempt) => {
        const score = calculatedTotalPoints > 0 ? (attempt.score / calculatedTotalPoints) * 100 : 0
        return Math.round(score * 10) / 10 // Round to 1 decimal place
      })

      const averageScore = totalAttempts > 0 
        ? scores.reduce((a, b) => a + b, 0) / totalAttempts 
        : 0
      const passRate = totalAttempts > 0
        ? (scores.filter((score) => score >= 70).length / totalAttempts) * 100
        : 0
      const highestScore = totalAttempts > 0 ? Math.max(...scores) : 0
      const lowestScore = totalAttempts > 0 ? Math.min(...scores) : 0

      setTest(testData)
      setAttempts(attemptsData)
      setAnalytics({
        totalAttempts,
        averageScore: Math.round(averageScore * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        highestScore: Math.round(highestScore * 10) / 10,
        lowestScore: Math.round(lowestScore * 10) / 10,
      })

    } catch (error) {
      console.error('Error in fetchTestData:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Stack spacing={4} align="center">
          <Spinner size="xl" />
          <Text>Loading analytics...</Text>
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
            <AlertTitle>Error loading analytics</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </VStack>
        </Alert>
        <Button mt={4} onClick={() => navigate('/teacher/dashboard')}>
          Return to Dashboard
        </Button>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Stack>
          <Heading size="lg">{test.title} - Analytics</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.300')}>
            View detailed performance analytics for this test
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Total Attempts</StatLabel>
              <StatNumber>{analytics.totalAttempts}</StatNumber>
            </Stat>
          </Box>

          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Average Score</StatLabel>
              <StatNumber>{analytics.averageScore}%</StatNumber>
            </Stat>
          </Box>

          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Pass Rate</StatLabel>
              <StatNumber>{analytics.passRate}%</StatNumber>
            </Stat>
          </Box>

          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Highest Score</StatLabel>
              <StatNumber>{analytics.highestScore}%</StatNumber>
            </Stat>
          </Box>

          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Lowest Score</StatLabel>
              <StatNumber>{analytics.lowestScore}%</StatNumber>
            </Stat>
          </Box>
        </SimpleGrid>

        <Box
          p={6}
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          overflowX="auto"
        >
          <Stack spacing={4}>
            <Heading size="md">Attempt History</Heading>

            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Score</Th>
                  <Th>Progress</Th>
                  <Th>Status</Th>
                  <Th>Duration</Th>
                </Tr>
              </Thead>
              <Tbody>
                {attempts.map((attempt) => {
                  const score = totalPoints > 0 ? Math.round((attempt.score / totalPoints) * 1000) / 10 : 0
                  const duration = attempt.completed_at
                    ? Math.round(
                        (new Date(attempt.completed_at) - new Date(attempt.started_at)) / 1000 / 60
                      )
                    : 'In Progress'

                  return (
                    <Tr key={attempt.id}>
                      <Td>{new Date(attempt.started_at).toLocaleDateString()}</Td>
                      <Td>
                        {attempt.score} / {totalPoints} ({score}%)
                      </Td>
                      <Td>
                        <Progress
                          value={score}
                          colorScheme={score >= 70 ? 'green' : 'red'}
                          size="sm"
                          borderRadius="full"
                          width="200px"
                        />
                      </Td>
                      <Td>
                        <Badge colorScheme={score >= 70 ? 'green' : 'red'}>
                          {score >= 70 ? 'Pass' : 'Fail'}
                        </Badge>
                      </Td>
                      <Td>{typeof duration === 'number' ? `${duration} minutes` : duration}</Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
} 