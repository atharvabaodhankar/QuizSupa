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
      // First fetch just the test without questions to verify access
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('id, title, description, duration, created_by, is_published')
        .eq('id', id)
        .single()

      if (testError) {
        console.error('Test fetch error:', testError)
        throw testError
      }

      console.log('Basic test data:', testData)

      // Then fetch questions separately
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, text, points')
        .eq('test_id', id)

      if (questionsError) {
        console.error('Questions fetch error:', questionsError)
        throw questionsError
      }

      console.log('Questions data:', questionsData)

      // Calculate total points
      const totalPoints = questionsData.reduce((sum, q) => sum + q.points, 0)

      // Add a visible note on the page about the N/A issue
      setTest({
        ...testData,
        note: "Note: If student names show as N/A, it may be because the test was taken before we added name tracking."
      })

      // Fetch attempts data
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          id,
          test_id,
          student_id,
          student_name,
          student_roll,
          score,
          completed_at,
          created_at
        `)
        .eq('test_id', id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })

      if (attemptsError) {
        console.error('Attempts fetch error:', attemptsError)
        throw attemptsError
      }

      console.log('Raw attempts data:', attemptsData)

      // Process attempts data
      const processedAttempts = attemptsData.map(attempt => ({
        ...attempt,
        student: {
          name: attempt.student_name || 'Unknown Student',
          roll_number: attempt.student_roll || 'N/A'
        }
      }))

      console.log('Processed attempts:', processedAttempts)

      // Calculate analytics
      const completedAttempts = processedAttempts.filter(a => a.completed_at)
      const scores = completedAttempts.map(a => a.score)
      const analytics = {
        totalAttempts: completedAttempts.length,
        averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        passRate: scores.length ? Math.round((scores.filter(s => s >= totalPoints * 0.4).length / scores.length) * 100) : 0,
        highestScore: scores.length ? Math.max(...scores) : 0,
        lowestScore: scores.length ? Math.min(...scores) : 0,
      }

      // Combine the data
      const combinedTestData = {
        ...testData,
        questions: questionsData
      }

      setTest(combinedTestData)
      setAttempts(processedAttempts)
      setTotalPoints(totalPoints)
      setAnalytics(analytics)
    } catch (error) {
      console.error('Error fetching test data:', error)
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
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={{ base: '8', md: '12' }}>
      <Stack spacing={{ base: '8', md: '12' }}>
        <Stack>
          <Heading size="lg">{test?.title} - Analytics</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.300')}>
            View student performance and test statistics
          </Text>

          {test.note && (
            <Box p={4} bg="yellow.100" borderRadius="md" mb={6}>
              <Text fontWeight="medium">{test.note}</Text>
            </Box>
          )}
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={6}>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Total Attempts</StatLabel>
              <StatNumber>{analytics.totalAttempts}</StatNumber>
            </Stat>
          </Box>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Average Score</StatLabel>
              <StatNumber>{analytics.averageScore}/{totalPoints}</StatNumber>
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
              <StatNumber>{analytics.highestScore}/{totalPoints}</StatNumber>
            </Stat>
          </Box>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Lowest Score</StatLabel>
              <StatNumber>{analytics.lowestScore}/{totalPoints}</StatNumber>
            </Stat>
          </Box>
        </SimpleGrid>

        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          overflow="hidden"
        >
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Student Information</Th>
                <Th>Score</Th>
                <Th>Performance</Th>
                <Th>Status</Th>
                <Th>Completed At</Th>
              </Tr>
            </Thead>
            <Tbody>
              {attempts.map((attempt) => {
                const percentage = Math.round((attempt.score / totalPoints) * 100)
                return (
                  <Tr key={attempt.id}>
                    <Td>
                      <Stack spacing={1}>
                        <Text fontWeight="medium">
                          {attempt.student?.name || 'Unknown Student'}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          Roll No: {attempt.student?.roll_number || 'N/A'}
                        </Text>
                      </Stack>
                    </Td>
                    <Td>
                      <Stack spacing={1}>
                        <Text fontWeight="medium">
                          {attempt.score}/{totalPoints}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          {percentage}%
                        </Text>
                      </Stack>
                    </Td>
                    <Td width="200px">
                      <Progress
                        value={percentage}
                        size="sm"
                        colorScheme={percentage >= 40 ? 'green' : 'red'}
                        borderRadius="full"
                      />
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={percentage >= 40 ? 'green' : 'red'}
                        padding="2"
                        borderRadius="full"
                      >
                        {percentage >= 40 ? 'PASS' : 'FAIL'}
                      </Badge>
                    </Td>
                    <Td>
                      {new Date(attempt.completed_at).toLocaleString()}
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </Box>
      </Stack>
    </Container>
  )
} 